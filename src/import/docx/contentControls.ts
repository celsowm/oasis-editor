/**
 * Parses `<w:sdtPr>` content-control (structured-document-tag) properties into
 * the typed {@link EditorSdtPr} so the editor can read the control's alias,
 * tag, id, lock, subtype, and `w:dataBinding`.
 */
import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorSdtDataBinding,
  EditorSdtListItem,
  EditorSdtPr,
  EditorSdtSubtype,
} from "@/core/model.js";
import {
  WORD_NS,
  WORD14_NS,
  WORD15_NS,
  getAttributeValue,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getFirstW14Child,
  getFirstW15Child,
  isWordTrue,
} from "./xmlHelpers.js";

const RECOGNIZED_WORD_SDT_PR_CHILDREN = new Set([
  "alias",
  "tag",
  "id",
  "lock",
  "placeholder",
  "dataBinding",
  "temporary",
  "appearance",
  "showingPlcHdr",
  "color",
  "text",
  "richText",
  "picture",
  "comboBox",
  "dropDownList",
  "date",
  // Keep accepting the old namespace form for compatibility with Oasis files
  // produced before the w15 correction.
  "repeatingSection",
  "repeatingSectionItem",
  "group",
  "equation",
  "citation",
  "bibliography",
]);

const RECOGNIZED_WORD15_SDT_PR_CHILDREN = new Set([
  "repeatingSection",
  "repeatingSectionItem",
]);

export function parseSdtPr(sdtPr: XmlElement | null): EditorSdtPr {
  if (!sdtPr) {
    return {};
  }

  const result: EditorSdtPr = {};

  const aliasEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "alias");
  if (aliasEl) {
    const alias = getAttributeValue(aliasEl, "val");
    if (alias !== null) result.alias = alias;
  }

  const tagEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "tag");
  if (tagEl) {
    const tag = getAttributeValue(tagEl, "val");
    if (tag !== null) result.tag = tag;
  }

  const idEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "id");
  if (idEl) {
    const id = getAttributeValue(idEl, "val");
    if (id !== null) result.id = id;
  }

  const lockEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "lock");
  if (lockEl) {
    const lock = getAttributeValue(lockEl, "val");
    if (lock !== null) result.lock = lock;
  }

  const appearanceEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "appearance");
  if (appearanceEl) {
    const appearance = getAttributeValue(appearanceEl, "val");
    if (appearance !== null) result.appearance = appearance;
  }

  const showingPlcHdrEl = getFirstChildByTagNameNS(
    sdtPr,
    WORD_NS,
    "showingPlcHdr",
  );
  if (showingPlcHdrEl) {
    result.showingPlcHdr = isWordTrue(
      getAttributeValue(showingPlcHdrEl, "val"),
    );
  }

  const temporaryEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "temporary");
  if (temporaryEl) {
    result.temporary = isWordTrue(getAttributeValue(temporaryEl, "val"));
  }

  const colorEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "color");
  if (colorEl) {
    const color = getAttributeValue(colorEl, "val");
    if (color !== null) result.color = color;
  }

  const placeholderEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "placeholder");
  if (placeholderEl) {
    const docPart = getFirstChildByTagNameNS(placeholderEl, WORD_NS, "docPart");
    if (docPart) {
      const docPartVal = getAttributeValue(docPart, "val");
      if (docPartVal !== null) result.placeholderDocPart = docPartVal;
    }
  }

  const dataBindingEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "dataBinding");
  if (dataBindingEl) {
    const dataBinding = parseSdtDataBinding(dataBindingEl);
    if (dataBinding) result.dataBinding = dataBinding;
  }

  const subtype = parseSdtSubtype(sdtPr);
  if (subtype) {
    result.subtype = subtype;
    if (subtype.kind === "repeatingSection") {
      const repeating =
        getFirstW15Child(sdtPr, "repeatingSection") ??
        getFirstChildByTagNameNS(sdtPr, WORD_NS, "repeatingSection");
      if (repeating) {
        const sectionTitle = getFirstW15Child(repeating, "sectionTitle");
        const noInsertDelete = getFirstW15Child(
          repeating,
          "doNotAllowInsertDeleteSection",
        );
        const properties: NonNullable<
          EditorSdtPr["repeatingSectionProperties"]
        > = {};
        const title = getAttributeValue(sectionTitle, "val");
        if (title !== null) properties.sectionTitle = title;
        if (noInsertDelete) {
          const raw = getAttributeValue(noInsertDelete, "val");
          properties.doNotAllowInsertDeleteSection =
            raw === null ? true : isWordTrue(raw);
        }
        if (Object.keys(properties).length > 0) {
          result.repeatingSectionProperties = properties;
        }
      }
    }
  }

  const unknownXml = serializeUnknownSdtPrChildren(sdtPr);
  if (unknownXml.length > 0) result.unknownXml = unknownXml;

  return result;
}

/**
 * Parse canonical `<w:dataBinding w:prefixMappings="…" w:xpath="…"
 * w:storeItemID="…"/>`. The child-element fallback keeps files emitted by
 * older Oasis versions readable while canonical export uses attributes.
 */
function parseSdtDataBinding(el: XmlElement): EditorSdtDataBinding | null {
  const dataBinding: EditorSdtDataBinding = {};

  const prefixMappings = getAttributeValue(el, "prefixMappings");
  const xpath = getAttributeValue(el, "xpath");
  const storeItemID = getAttributeValue(el, "storeItemID");

  if (prefixMappings !== null) dataBinding.prefixMappings = prefixMappings;
  if (xpath !== null) dataBinding.xpath = xpath;
  if (storeItemID !== null) dataBinding.storeItemID = storeItemID;

  if (dataBinding.prefixMappings === undefined) {
    const legacy = getFirstChildByTagNameNS(el, WORD_NS, "prefixMappings");
    const value = getAttributeValue(legacy, "val");
    if (value !== null) dataBinding.prefixMappings = value;
  }
  if (dataBinding.xpath === undefined) {
    const legacy = getFirstChildByTagNameNS(el, WORD_NS, "xpath");
    const value = getAttributeValue(legacy, "val");
    if (value !== null) dataBinding.xpath = value;
  }
  if (dataBinding.storeItemID === undefined) {
    const legacy = getFirstChildByTagNameNS(el, WORD_NS, "storeItemID");
    const value = getAttributeValue(legacy, "val");
    if (value !== null) dataBinding.storeItemID = value;
  }

  return dataBinding.prefixMappings === undefined &&
    dataBinding.xpath === undefined &&
    dataBinding.storeItemID === undefined
    ? null
    : dataBinding;
}

function parseSdtListItems(
  parent: XmlElement,
): EditorSdtListItem[] | undefined {
  const items = getChildrenByTagNameNS(parent, WORD_NS, "listItem");
  if (items.length === 0) return undefined;
  return items.map(
    (item): EditorSdtListItem => ({
      displayText: getAttributeValue(item, "displayText") ?? undefined,
      value: getAttributeValue(item, "value") ?? undefined,
    }),
  );
}

function parseSdtSubtype(parent: XmlElement): EditorSdtSubtype | undefined {
  const comboBoxEl = getFirstChildByTagNameNS(parent, WORD_NS, "comboBox");
  if (comboBoxEl) {
    const lastSelectedEl = getFirstChildByTagNameNS(
      comboBoxEl,
      WORD_NS,
      "lastSelectedValue",
    );
    return {
      kind: "comboBox",
      listItems: parseSdtListItems(comboBoxEl),
      ...(lastSelectedEl
        ? {
            lastSelectedValue:
              getAttributeValue(lastSelectedEl, "val") ?? undefined,
          }
        : {}),
    };
  }

  const dropDownEl = getFirstChildByTagNameNS(parent, WORD_NS, "dropDownList");
  if (dropDownEl) {
    const lastSelectedEl = getFirstChildByTagNameNS(
      dropDownEl,
      WORD_NS,
      "lastSelectedValue",
    );
    return {
      kind: "dropDownList",
      listItems: parseSdtListItems(dropDownEl),
      ...(lastSelectedEl
        ? {
            lastSelectedValue:
              getAttributeValue(lastSelectedEl, "val") ?? undefined,
          }
        : {}),
    };
  }

  const dateEl = getFirstChildByTagNameNS(parent, WORD_NS, "date");
  if (dateEl) {
    const fullDate = getAttributeValue(dateEl, "fullDate") ?? undefined;
    const dateFormatEl = getFirstChildByTagNameNS(
      dateEl,
      WORD_NS,
      "dateFormat",
    );
    const lidEl = getFirstChildByTagNameNS(dateEl, WORD_NS, "lid");
    const calendarEl = getFirstChildByTagNameNS(dateEl, WORD_NS, "calendar");
    const storeMappedDataAsEl = getFirstChildByTagNameNS(
      dateEl,
      WORD_NS,
      "storeMappedDataAs",
    );
    return {
      kind: "date",
      fullDate,
      dateFormat: dateFormatEl
        ? (getAttributeValue(dateFormatEl, "val") ?? undefined)
        : undefined,
      lid: lidEl ? (getAttributeValue(lidEl, "val") ?? undefined) : undefined,
      calendar: calendarEl
        ? (getAttributeValue(calendarEl, "val") ?? undefined)
        : undefined,
      storeMappedDataAs: storeMappedDataAsEl
        ? (getAttributeValue(storeMappedDataAsEl, "val") ?? undefined)
        : undefined,
    };
  }

  const textEl = getFirstChildByTagNameNS(parent, WORD_NS, "text");
  if (textEl) return { kind: "text" };

  for (const kind of [
    "richText",
    "picture",
    "group",
    "equation",
    "citation",
    "bibliography",
  ] as const) {
    if (getFirstChildByTagNameNS(parent, WORD_NS, kind)) return { kind };
  }

  if (
    getFirstW15Child(parent, "repeatingSection") ||
    getFirstChildByTagNameNS(parent, WORD_NS, "repeatingSection")
  ) {
    return { kind: "repeatingSection" };
  }
  if (
    getFirstW15Child(parent, "repeatingSectionItem") ||
    getFirstChildByTagNameNS(parent, WORD_NS, "repeatingSectionItem")
  ) {
    return { kind: "repeatingSectionItem" };
  }

  const w14CheckboxEl = getFirstW14Child(parent, "checkbox");
  if (w14CheckboxEl) {
    const checkedEl = getFirstChildByTagNameNS(
      w14CheckboxEl,
      WORD14_NS,
      "checked",
    );
    const checkedStateEl = getFirstChildByTagNameNS(
      w14CheckboxEl,
      WORD14_NS,
      "checkedState",
    );
    const uncheckedStateEl = getFirstChildByTagNameNS(
      w14CheckboxEl,
      WORD14_NS,
      "uncheckedState",
    );
    const checked = checkedEl
      ? isWordTrue(getAttributeValue(checkedEl, "val"))
      : undefined;
    return {
      kind: "checkbox",
      ...(checked !== undefined ? { checked } : {}),
      ...(checkedStateEl
        ? {
            checkedStateFont:
              getAttributeValue(checkedStateEl, "font") ?? undefined,
            checkedStateChar:
              getAttributeValue(checkedStateEl, "char") ?? undefined,
          }
        : {}),
      ...(uncheckedStateEl
        ? {
            uncheckedStateFont:
              getAttributeValue(uncheckedStateEl, "font") ?? undefined,
            uncheckedStateChar:
              getAttributeValue(uncheckedStateEl, "char") ?? undefined,
          }
        : {}),
    };
  }

  return undefined;
}

function serializeUnknownSdtPrChildren(sdtPr: XmlElement): string {
  let out = "";
  for (let i = 0; i < sdtPr.childNodes.length; i += 1) {
    const node = sdtPr.childNodes[i];
    if (node?.nodeType !== node.ELEMENT_NODE) continue;
    const el = node as XmlElement;
    const recognizedWord =
      el.localName &&
      el.namespaceURI === WORD_NS &&
      RECOGNIZED_WORD_SDT_PR_CHILDREN.has(el.localName);
    const recognizedWord15 =
      el.localName &&
      el.namespaceURI === WORD15_NS &&
      RECOGNIZED_WORD15_SDT_PR_CHILDREN.has(el.localName);
    if (recognizedWord || recognizedWord15) continue;
    out += new XMLSerializer().serializeToString(el);
  }
  return out;
}

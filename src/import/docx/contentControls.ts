/**
 * Parses `<w:sdtPr>` content-control (structured-document-tag) properties into
 * the typed {@link EditorSdtPr} so the editor can read the control's alias,
 * tag, id, lock, subtype, and `w:dataBinding`. The CT_SdtPr schema sequence is:
 * `rPr?`, `alias?`, `tag?`, `id?`, `lock?`, `placeholder?`, `dataBinding?`,
 * `temporary?`, then exactly one content-control subtype element (`text`,
 * `richText`, `picture`, `comboBox`, `dropDownList`, `date`, `checkbox`,
 * `repeatingSection`, `repeatingSectionItem`, `group`, `equation`, `citation`,
 * `bibliography`), then any extension children.
 *
 * `rPr` (run properties baked into the control itself) is not modeled; round-trip
 * uses the `unknownXml` bag. Unknown future-schema children are preserved
 * verbatim in {@link EditorSdtPr.unknownXml} so export re-emits them byte-for-byte.
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
  getAttributeValue,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getFirstW14Child,
  isWordTrue,
} from "./xmlHelpers.js";

/** OOXML CT_SdtPr schema child sequence (after `rPr`, which is preserved raw). */
const RECOGNIZED_SDT_PR_CHILDREN = new Set([
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
  "repeatingSection",
  "repeatingSectionItem",
  "group",
  "equation",
  "citation",
  "bibliography",
]);

/**
 * Parse a `<w:sdtPr>` element into the typed model. Returns `{}` (empty) when
 * `sdtPr` is null or has no recognized children; the caller still attaches an
 * empty wrapper so the round-trip emits an empty `<w:sdtPr/>`.
 */
export function parseSdtPr(sdtPr: XmlElement | null): EditorSdtPr {
  if (!sdtPr) {
    return {};
  }

  const result: EditorSdtPr = {};

  const aliasEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "alias");
  if (aliasEl) {
    const alias = getAttributeValue(aliasEl, "val");
    if (alias !== null) {
      result.alias = alias;
    }
  }

  const tagEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "tag");
  if (tagEl) {
    const tag = getAttributeValue(tagEl, "val");
    if (tag !== null) {
      result.tag = tag;
    }
  }

  const idEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "id");
  if (idEl) {
    const id = getAttributeValue(idEl, "val");
    if (id !== null) {
      result.id = id;
    }
  }

  const lockEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "lock");
  if (lockEl) {
    const lock = getAttributeValue(lockEl, "val");
    if (lock !== null) {
      result.lock = lock;
    }
  }

  const appearanceEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "appearance");
  if (appearanceEl) {
    const appearance = getAttributeValue(appearanceEl, "val");
    if (appearance !== null) {
      result.appearance = appearance;
    }
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
    if (color !== null) {
      result.color = color;
    }
  }

  const placeholderEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "placeholder");
  if (placeholderEl) {
    const docPart = getFirstChildByTagNameNS(placeholderEl, WORD_NS, "docPart");
    if (docPart) {
      const docPartVal = getAttributeValue(docPart, "val");
      if (docPartVal !== null) {
        result.placeholderDocPart = docPartVal;
      }
    }
  }

  const dataBindingEl = getFirstChildByTagNameNS(sdtPr, WORD_NS, "dataBinding");
  if (dataBindingEl) {
    const dataBinding = parseSdtDataBinding(dataBindingEl);
    if (dataBinding) {
      result.dataBinding = dataBinding;
    }
  }

  const subtype = parseSdtSubtype(sdtPr);
  if (subtype) {
    result.subtype = subtype;
  }

  const unknownXml = serializeUnknownSdtPrChildren(sdtPr);
  if (unknownXml.length > 0) {
    result.unknownXml = unknownXml;
  }

  return result;
}

/** Parse `<w:dataBinding>` (prefix mappings, xpath, storeItemID). */
function parseSdtDataBinding(el: XmlElement): EditorSdtDataBinding | null {
  const prefixMappingsEl = getFirstChildByTagNameNS(
    el,
    WORD_NS,
    "prefixMappings",
  );
  const xpathEl = getFirstChildByTagNameNS(el, WORD_NS, "xpath");
  const storeItemIDEl = getFirstChildByTagNameNS(el, WORD_NS, "storeItemID");
  const dataBinding: EditorSdtDataBinding = {};
  if (prefixMappingsEl) {
    const val = getAttributeValue(prefixMappingsEl, "val");
    if (val !== null) {
      dataBinding.prefixMappings = val;
    }
  }
  if (xpathEl) {
    const val = getAttributeValue(xpathEl, "val");
    if (val !== null) {
      dataBinding.xpath = val;
    }
  }
  if (storeItemIDEl) {
    const val = getAttributeValue(storeItemIDEl, "val");
    if (val !== null) {
      dataBinding.storeItemID = val;
    }
  }
  if (
    dataBinding.prefixMappings === undefined &&
    dataBinding.xpath === undefined &&
    dataBinding.storeItemID === undefined
  ) {
    return null;
  }
  return dataBinding;
}

/** Parse `<w:listItem>` children of a `<w:comboBox>` or `<w:dropDownList>`. */
function parseSdtListItems(
  parent: XmlElement,
): EditorSdtListItem[] | undefined {
  const items = getChildrenByTagNameNS(parent, WORD_NS, "listItem");
  if (items.length === 0) {
    return undefined;
  }
  return items.map(
    (item): EditorSdtListItem => ({
      displayText: getAttributeValue(item, "displayText") ?? undefined,
      value: getAttributeValue(item, "value") ?? undefined,
    }),
  );
}

/** Parse the single content-control subtype element (`<w:text>`, `<w:date>`, …). */
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
  if (textEl) {
    return { kind: "text" };
  }

  for (const kind of [
    "richText",
    "picture",
    "group",
    "equation",
    "citation",
    "bibliography",
    "repeatingSection",
    "repeatingSectionItem",
  ] as const) {
    if (getFirstChildByTagNameNS(parent, WORD_NS, kind)) {
      return { kind };
    }
  }

  // Modern checkbox lives under w14 (or wrapped in `mc:AlternateContent`).
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

/**
 * Build the `unknownXml` fallback: concatenated serialized XML of any
 * `w:sdtPr` element the parser does not recognize (different localName in the
 * `w` namespace, or anything in any foreign namespace, including `rPr` run
 * properties baked into the control, `w15:*` extension store references, and
 * the legacy `mc:AlternateContent` wrapper around `w14:checkbox`).
 */
function serializeUnknownSdtPrChildren(sdtPr: XmlElement): string {
  let out = "";
  for (let i = 0; i < sdtPr.childNodes.length; i += 1) {
    const node = sdtPr.childNodes[i];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const el = node as XmlElement;
    if (
      el.localName &&
      el.namespaceURI === WORD_NS &&
      RECOGNIZED_SDT_PR_CHILDREN.has(el.localName)
    ) {
      continue;
    }
    out += new XMLSerializer().serializeToString(el);
  }
  return out;
}

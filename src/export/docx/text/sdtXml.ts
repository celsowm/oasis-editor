/**
 * Serializes a typed {@link EditorSdtPr} back to `<w:sdtPr>` XML, emitting the
 * recognized children in the CT_SdtPr schema sequence (`alias`, `tag`, `id`,
 * `lock`, `placeholder`, `dataBinding`, `temporary`, then the single subtype
 * element, then `appearance`/`showingPlcHdr`/`color` which the schema groups with
 * extension attributes). Unknown future-schema children preserved in
 * `unknownXml` are appended verbatim to keep documents byte-faithful on round-trip.
 *
 * The serializer produces only string output (the export pipeline is deterministic
 * string concatenation, never DOM-based), with `escapeXml` applied to user-facing
 * values (`alias`, `tag`) since a control name may legitimately contain any XML
 * special character.
 */
import type {
  EditorSdtDataBinding,
  EditorSdtListItem,
  EditorSdtPr,
  EditorSdtSubtype,
} from "@/core/model.js";
import { escapeXml } from "../xmlUtils.js";

/**
 * `<w:sdtPr>` requires its subtype element to be the final named child per schema
 * order, with `appearance`, `showingPlcHdr`, `color` trailing as extension-like
 * properties. The exact ordering used by Word is: rPr, alias, tag, id, lock,
 * placeholder, dataBinding, temporary, subtype, appearance, showingPlcHdr,
 * color, extension. We mirror that so we round-trip as schema-valid.
 */
export function serializeSdtPrXml(sdtPr: EditorSdtPr): string {
  const hasAnyField =
    sdtPr.alias !== undefined ||
    sdtPr.tag !== undefined ||
    sdtPr.id !== undefined ||
    sdtPr.lock !== undefined ||
    sdtPr.appearance !== undefined ||
    sdtPr.showingPlcHdr !== undefined ||
    sdtPr.temporary !== undefined ||
    sdtPr.color !== undefined ||
    sdtPr.placeholderDocPart !== undefined ||
    sdtPr.dataBinding !== undefined ||
    sdtPr.subtype !== undefined ||
    (sdtPr.unknownXml ?? "").length > 0;

  if (!hasAnyField) {
    return "<w:sdtPr/>";
  }

  let inner = "";

  if (sdtPr.alias !== undefined) {
    inner += `<w:alias w:val="${escapeXml(sdtPr.alias)}"/>`;
  }
  if (sdtPr.tag !== undefined) {
    inner += `<w:tag w:val="${escapeXml(sdtPr.tag)}"/>`;
  }
  if (sdtPr.id !== undefined) {
    inner += `<w:id w:val="${escapeXml(sdtPr.id)}"/>`;
  }
  if (sdtPr.lock !== undefined) {
    inner += `<w:lock w:val="${escapeXml(sdtPr.lock)}"/>`;
  }
  if (sdtPr.placeholderDocPart !== undefined) {
    inner += `<w:placeholder><w:docPart w:val="${escapeXml(
      sdtPr.placeholderDocPart,
    )}"/></w:placeholder>`;
  }
  if (sdtPr.dataBinding !== undefined) {
    inner += serializeSdtDataBindingXml(sdtPr.dataBinding);
  }
  if (sdtPr.temporary !== undefined) {
    inner += `<w:temporary w:val="${sdtPr.temporary ? "true" : "false"}"/>`;
  }
  if (sdtPr.subtype !== undefined) {
    inner += serializeSdtSubtypeXml(sdtPr.subtype);
  }
  if (sdtPr.appearance !== undefined) {
    inner += `<w:appearance w:val="${escapeXml(sdtPr.appearance)}"/>`;
  }
  if (sdtPr.showingPlcHdr !== undefined) {
    inner += `<w:showingPlcHdr w:val="${
      sdtPr.showingPlcHdr ? "true" : "false"
    }"/>`;
  }
  if (sdtPr.color !== undefined) {
    inner += `<w:color w:val="${escapeXml(sdtPr.color)}"/>`;
  }
  if (sdtPr.unknownXml) {
    inner += sdtPr.unknownXml;
  }

  return `<w:sdtPr>${inner}</w:sdtPr>`;
}

function serializeSdtDataBindingXml(dataBinding: EditorSdtDataBinding): string {
  let inner = "";
  if (dataBinding.prefixMappings !== undefined) {
    inner += `<w:prefixMappings w:val="${escapeXml(
      dataBinding.prefixMappings,
    )}"/>`;
  }
  if (dataBinding.xpath !== undefined) {
    inner += `<w:xpath w:val="${escapeXml(dataBinding.xpath)}"/>`;
  }
  if (dataBinding.storeItemID !== undefined) {
    inner += `<w:storeItemID w:val="${escapeXml(dataBinding.storeItemID)}"/>`;
  }
  return inner ? `<w:dataBinding>${inner}</w:dataBinding>` : "";
}

function serializeSdtListItemXml(item: EditorSdtListItem): string {
  const displayTextAttr =
    item.displayText !== undefined
      ? ` w:displayText="${escapeXml(item.displayText)}"`
      : "";
  const valueAttr =
    item.value !== undefined ? ` w:value="${escapeXml(item.value)}"` : "";
  return `<w:listItem${displayTextAttr}${valueAttr}/>`;
}

function serializeSdtSubtypeXml(subtype: EditorSdtSubtype): string {
  switch (subtype.kind) {
    case "text":
      return "<w:text/>";
    case "richText":
      return "<w:richText/>";
    case "picture":
      return "<w:picture/>";
    case "group":
      return "<w:group/>";
    case "equation":
      return "<w:equation/>";
    case "citation":
      return "<w:citation/>";
    case "bibliography":
      return "<w:bibliography/>";
    case "repeatingSection":
      return "<w:repeatingSection/>";
    case "repeatingSectionItem":
      return "<w:repeatingSectionItem/>";
    case "comboBox":
    case "dropDownList": {
      const items = (subtype.listItems ?? [])
        .map(serializeSdtListItemXml)
        .join("");
      const lastSelected =
        subtype.lastSelectedValue !== undefined
          ? `<w:lastSelectedValue w:val="${escapeXml(
              subtype.lastSelectedValue,
            )}"/>`
          : "";
      return `<w:${subtype.kind}>${items}${lastSelected}</w:${subtype.kind}>`;
    }
    case "date": {
      const fullDateAttr =
        subtype.fullDate !== undefined
          ? ` w:fullDate="${escapeXml(subtype.fullDate)}"`
          : "";
      let children = "";
      if (subtype.dateFormat !== undefined) {
        children += `<w:dateFormat w:val="${escapeXml(subtype.dateFormat)}"/>`;
      }
      if (subtype.lid !== undefined) {
        children += `<w:lid w:val="${escapeXml(subtype.lid)}"/>`;
      }
      if (subtype.calendar !== undefined) {
        children += `<w:calendar w:val="${escapeXml(subtype.calendar)}"/>`;
      }
      if (subtype.storeMappedDataAs !== undefined) {
        children += `<w:storeMappedDataAs w:val="${escapeXml(
          subtype.storeMappedDataAs,
        )}"/>`;
      }
      return `<w:date${fullDateAttr}>${children}</w:date>`;
    }
    case "checkbox": {
      let children = "";
      if (subtype.checked !== undefined) {
        children += `<w14:checked w14:val="${subtype.checked ? "1" : "0"}"/>`;
      }
      if (
        subtype.checkedStateFont !== undefined ||
        subtype.checkedStateChar !== undefined
      ) {
        const fontAttr =
          subtype.checkedStateFont !== undefined
            ? ` w14:font="${escapeXml(subtype.checkedStateFont)}"`
            : "";
        const charAttr =
          subtype.checkedStateChar !== undefined
            ? ` w14:char="${escapeXml(subtype.checkedStateChar)}"`
            : "";
        children += `<w14:checkedState${fontAttr}${charAttr}/>`;
      }
      if (
        subtype.uncheckedStateFont !== undefined ||
        subtype.uncheckedStateChar !== undefined
      ) {
        const fontAttr =
          subtype.uncheckedStateFont !== undefined
            ? ` w14:font="${escapeXml(subtype.uncheckedStateFont)}"`
            : "";
        const charAttr =
          subtype.uncheckedStateChar !== undefined
            ? ` w14:char="${escapeXml(subtype.uncheckedStateChar)}"`
            : "";
        children += `<w14:uncheckedState${fontAttr}${charAttr}/>`;
      }
      // `w14:checkbox` is the modern checkbox extension element; the consumer
      // (`document.xml`) declares `xmlns:w14`, so the prefixed emission is valid.
      return `<w14:checkbox>${children}</w14:checkbox>`;
    }
    default: {
      // Exhaustiveness guard — if a new subtype is added to the union without
      // a serializer case the build fails.
      const _exhaustive: never = subtype;
      return _exhaustive as never;
    }
  }
}

/** Serializes typed content-control properties as schema-valid WordprocessingML. */
import type {
  EditorSdtDataBinding,
  EditorSdtListItem,
  EditorSdtPr,
  EditorSdtSubtype,
} from "@/core/model.js";
import { escapeXml } from "../xmlUtils.js";

const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const WORD15_XMLNS = `xmlns:w15="${WORD15_NS}"`;

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
    sdtPr.repeatingSectionProperties !== undefined ||
    (sdtPr.unknownXml ?? "").length > 0;

  if (!hasAnyField) return "<w:sdtPr/>";

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
    inner += serializeSdtSubtypeXml(
      sdtPr.subtype,
      sdtPr.repeatingSectionProperties,
    );
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
  if (sdtPr.unknownXml) inner += sdtPr.unknownXml;

  return `<w:sdtPr>${inner}</w:sdtPr>`;
}

/** CT_DataBinding stores all three semantic values as attributes. */
function serializeSdtDataBindingXml(dataBinding: EditorSdtDataBinding): string {
  const attrs: string[] = [];
  if (dataBinding.prefixMappings !== undefined) {
    attrs.push(`w:prefixMappings="${escapeXml(dataBinding.prefixMappings)}"`);
  }
  if (dataBinding.xpath !== undefined) {
    attrs.push(`w:xpath="${escapeXml(dataBinding.xpath)}"`);
  }
  if (dataBinding.storeItemID !== undefined) {
    attrs.push(`w:storeItemID="${escapeXml(dataBinding.storeItemID)}"`);
  }
  return attrs.length > 0 ? `<w:dataBinding ${attrs.join(" ")}/>` : "";
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

function serializeRepeatingSectionXml(
  properties: EditorSdtPr["repeatingSectionProperties"],
): string {
  let children = "";
  if (properties?.sectionTitle !== undefined) {
    children += `<w15:sectionTitle w15:val="${escapeXml(properties.sectionTitle)}"/>`;
  }
  if (properties?.doNotAllowInsertDeleteSection !== undefined) {
    children += `<w15:doNotAllowInsertDeleteSection w15:val="${
      properties.doNotAllowInsertDeleteSection ? "1" : "0"
    }"/>`;
  }
  return children
    ? `<w15:repeatingSection ${WORD15_XMLNS}>${children}</w15:repeatingSection>`
    : `<w15:repeatingSection ${WORD15_XMLNS}/>`;
}

function serializeSdtSubtypeXml(
  subtype: EditorSdtSubtype,
  repeatingSectionProperties?: EditorSdtPr["repeatingSectionProperties"],
): string {
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
      return serializeRepeatingSectionXml(repeatingSectionProperties);
    case "repeatingSectionItem":
      return `<w15:repeatingSectionItem ${WORD15_XMLNS}/>`;
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
      return `<w14:checkbox>${children}</w14:checkbox>`;
    }
    default: {
      const _exhaustive: never = subtype;
      return _exhaustive as never;
    }
  }
}

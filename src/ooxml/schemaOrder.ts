export const P_PR_CHILD_ORDER: readonly string[] = [
  "pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr",
  "widowControl", "numPr", "suppressLineNumbers", "pBdr", "shd",
  "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap", "overflowPunct",
  "topLinePunct", "activeRecord", "toC", "isLgl", "rPr", "sectPr",
  "pBdr", "ind", "contextualSpacing", "mirrorIndents", "suppressOverlap",
  "jc", "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl",
  "divId", "cnfStyle", "rPr",
];

export const R_PR_CHILD_ORDER: readonly string[] = [
  "rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps",
  "strike", "dstrike", "outline", "shadow", "emboss", "imprint",
  "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing",
  "w", "kern", "position", "sz", "szCs", "highlight", "u", "effect",
  "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang",
  "eastAsianLayout", "specVanish", "oMath", "rPrChange",
];

export const TBL_PR_CHILD_ORDER: readonly string[] = [
  "tblStyle", "tblpPr", "tblCellMar", "tblStyleRowBandSize",
  "tblStyleColBandSize", "tblW", "jc", "tblCellMar", "tblBorders",
  "shd", "tblLayout", "tblCellMar", "tblLook", "tblCaption", "tblDescription",
];

export const SECT_PR_CHILD_ORDER: readonly string[] = [
  "headerReference", "footerReference", "footnotePr", "endnotePr",
  "type", "pgSz", "pgMar", "paperSrc", "pgBorders", "lnNumType",
  "pgNumType", "cols", "formProt", "vAlign", "noEndnote", "titlePg",
  "textDirection", "bidi", "rtlGutter", "docGrid", "printerSettings", "sectPrChange",
];

export const STYLE_CHILD_ORDER: readonly string[] = [
  "name", "aliases", "basedOn", "next", "link", "autoRedefine",
  "hidden", "uiPriority", "semiHidden", "unhideWhenUsed", "qFormat",
  "locked", "personal", "personalCompose", "personalReply", "rsid",
  "pPr", "rPr", "tblPr", "trPr", "tcPr", "tblStylePr",
];

export function getOrderIndex(childName: string, schemaOrder: readonly string[]): number {
  const localName = childName.includes(":") ? childName.split(":")[1] : childName;
  const index = schemaOrder.indexOf(localName);
  return index >= 0 ? index : 9999;
}

export function sortXmlNodesBySchemaOrder<T>(
  nodes: T[],
  getName: (node: T) => string,
  schemaOrder: readonly string[]
): T[] {
  return [...nodes].sort((a, b) => {
    const orderA = getOrderIndex(getName(a), schemaOrder);
    const orderB = getOrderIndex(getName(b), schemaOrder);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return 0;
  });
}

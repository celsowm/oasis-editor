// Typed merge keys for history transactions (P1, "primitive obsession").
//
// A transaction's `mergeKey` groups consecutive edits into a single undo step.
// It used to be a free-form `string`, so a typo silently broke grouping and was
// only observable at runtime. These named constants are the single source of
// truth; the `MergeKey` union makes an unknown key a compile error.
//
// Leaf module: no imports, lives in `core` so both `app` and `ui` may consume it
// without violating the import-graph rules.

export const MERGE_KEYS = {
  insertText: "insertText",
  composition: "composition",
  insertImage: "insertImage",
  insertTable: "insertTable",
  moveImage: "moveImage",
  splitListItem: "splitListItem",
  link: "link",
  imageAlt: "imageAlt",
  imageCaption: "imageCaption",
  imageResize: "imageResize",
  imageCrop: "imageCrop",
  layoutWrapPolygon: "layoutWrapPolygon",
  specialIndent: "specialIndent",
  paraBorders: "paraBorders",
  findReplace: "findReplace",
  findReplaceAll: "findReplaceAll",
  tableProperties: "tableProperties",
  paragraphDialog: "paragraph-dialog",
  fontDialog: "font-dialog",
  copyTextByDrag: "copyTextByDrag",
  moveTextByDrag: "moveTextByDrag",
  collapseSelectionByClick: "collapseSelectionByClick",
  mergeTable: "mergeTable",
  splitTable: "splitTable",
  insertTableColumn: "insertTableColumn",
  deleteTableColumn: "deleteTableColumn",
  insertTableRow: "insertTableRow",
  deleteTableRow: "deleteTableRow",
  tableShading: "tableShading",
  tableBorders: "tableBorders",
  tableWidth: "tableWidth",
  tableAlign: "tableAlign",
  tableCellVerticalAlign: "tableCellVerticalAlign",
  tableCellTextDirection: "tableCellTextDirection",
  tableCellWidth: "tableCellWidth",
  tableToText: "tableToText",
  textToTable: "textToTable",
  tableSplitAtRow: "tableSplitAtRow",
  tableSortAscending: "tableSortAscending",
  tableSortDescending: "tableSortDescending",
  tableDelete: "tableDelete",
  deleteTableCell: "deleteTableCell",
  tableAutoFit: "tableAutoFit",
  tableRepeatHeaderRows: "tableRepeatHeaderRows",
  tableCellMargins: "tableCellMargins",
  tableFormula: "tableFormula",
  tableRowHeight: "tableRowHeight",
  tableStyleOptions: "tableStyleOptions",
  tableStyleGallery: "tableStyleGallery",
  tableDistribute: "tableDistribute",
  layoutWrapPreset: "layoutWrapPreset",
  layoutFixedPosition: "layoutFixedPosition",
} as const;

export type MergeKey = (typeof MERGE_KEYS)[keyof typeof MERGE_KEYS];

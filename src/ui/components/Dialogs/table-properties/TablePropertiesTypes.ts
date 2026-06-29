import type {
  EditorBorderStyle,
  EditorDocxWidthValue,
  EditorTableRowHeightRule,
  EditorTableFloatingLayout,
} from "@/core/model.js";

export type TableWidthUnit = "points" | "percent";
export type BorderStyleValue = "none" | "solid" | "dashed" | "dotted";

export interface TablePropertiesDialogInitialValues {
  activeTab?: "table" | "row" | "column" | "cell" | "altText";
  tableWidth: string;
  tableWidthUnit: TableWidthUnit;
  tableAlign: "" | "left" | "center" | "right";
  tableIndentLeft: string;
  tableWrapping: "none" | "around";
  floatingSummary: string;
  floatingHorizontalAnchor: "margin" | "page" | "text";
  floatingVerticalAnchor: "margin" | "page" | "text";
  floatingX: string;
  floatingY: string;
  floatingXAlign: "" | "left" | "center" | "right" | "inside" | "outside";
  floatingYAlign: "" | "top" | "center" | "bottom" | "inside" | "outside";
  floatingDistanceTop: string;
  floatingDistanceRight: string;
  floatingDistanceBottom: string;
  floatingDistanceLeft: string;
  floatingOverlap: "overlap" | "never";
  rowHeight: string;
  rowHeightRule: EditorTableRowHeightRule | "";
  repeatHeader: boolean;
  allowBreakAcrossPages: boolean;
  hiddenRow: boolean;
  columnWidth: string;
  cellWidth: string;
  cellVerticalAlign: "" | "top" | "middle" | "bottom";
  cellTextDirection: "" | "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV";
  cellNoWrap: boolean;
  cellFitText: boolean;
  cellHideMark: boolean;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  borderStyle: BorderStyleValue;
  borderWidth: string;
  borderColor: string;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderStart: boolean;
  borderEnd: boolean;
  borderTopLeftToBottomRight: boolean;
  borderTopRightToBottomLeft: boolean;
  shading: string;
  altTitle: string;
  altDescription: string;
}

export interface TablePropertiesDialogBorders {
  top: EditorBorderStyle | null;
  right: EditorBorderStyle | null;
  bottom: EditorBorderStyle | null;
  left: EditorBorderStyle | null;
  start: EditorBorderStyle | null;
  end: EditorBorderStyle | null;
  topLeftToBottomRight: EditorBorderStyle | null;
  topRightToBottomLeft: EditorBorderStyle | null;
}

export interface TablePropertiesDialogApplyValues {
  tableWidth: EditorDocxWidthValue | null;
  tableAlign: "left" | "center" | "right" | null;
  tableIndentLeft: EditorDocxWidthValue | null;
  tableFloating: EditorTableFloatingLayout | null;
  tableOverlap: "overlap" | "never" | null;
  rowHeight: EditorDocxWidthValue | null;
  rowHeightRule: EditorTableRowHeightRule | null;
  repeatHeader: boolean;
  cantSplit: boolean;
  hiddenRow: boolean;
  columnWidth: EditorDocxWidthValue | null;
  cellWidth: EditorDocxWidthValue | null;
  cellVerticalAlign: "top" | "middle" | "bottom" | null;
  cellTextDirection: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | null;
  cellNoWrap: boolean | null;
  cellFitText: boolean | null;
  cellHideMark: boolean | null;
  margins: {
    top: number | null;
    right: number | null;
    bottom: number | null;
    left: number | null;
  };
  borders: TablePropertiesDialogBorders;
  shading: string | null;
  altTitle: string | null;
  altDescription: string | null;
}

export interface TablePropertiesDialogProps {
  isOpen: boolean;
  initial: TablePropertiesDialogInitialValues;
  onClose: () => void;
  onApply: (
    values: TablePropertiesDialogApplyValues,
    original: TablePropertiesDialogInitialValues,
  ) => void;
}

/** Single reactive store shape, replacing 40+ individual signals. */
export interface TableFormState {
  activeTab: string;
  tableWidth: string;
  tableWidthUnit: TableWidthUnit;
  tableAlign: TablePropertiesDialogInitialValues["tableAlign"];
  tableIndentLeft: string;
  tableWrapping: TablePropertiesDialogInitialValues["tableWrapping"];
  floatingHorizontalAnchor: TablePropertiesDialogInitialValues["floatingHorizontalAnchor"];
  floatingVerticalAnchor: TablePropertiesDialogInitialValues["floatingVerticalAnchor"];
  floatingX: string;
  floatingY: string;
  floatingXAlign: TablePropertiesDialogInitialValues["floatingXAlign"];
  floatingYAlign: TablePropertiesDialogInitialValues["floatingYAlign"];
  floatingDistanceTop: string;
  floatingDistanceRight: string;
  floatingDistanceBottom: string;
  floatingDistanceLeft: string;
  floatingOverlap: TablePropertiesDialogInitialValues["floatingOverlap"];
  rowHeight: string;
  rowHeightRule: TablePropertiesDialogInitialValues["rowHeightRule"];
  repeatHeader: boolean;
  allowBreakAcrossPages: boolean;
  hiddenRow: boolean;
  columnWidth: string;
  cellWidth: string;
  cellVerticalAlign: TablePropertiesDialogInitialValues["cellVerticalAlign"];
  cellTextDirection: TablePropertiesDialogInitialValues["cellTextDirection"];
  cellNoWrap: boolean;
  cellFitText: boolean;
  cellHideMark: boolean;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  borderStyle: BorderStyleValue;
  borderWidth: string;
  borderColor: string;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderStart: boolean;
  borderEnd: boolean;
  borderTlBr: boolean;
  borderTrBl: boolean;
  shading: string;
  altTitle: string;
  altDescription: string;
}

export const DEFAULT_BORDER_WIDTH_PT = 0.5;
export const DEFAULT_BORDER_COLOR = "#000000";

export function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseWidth(
  value: string,
  unit: TableWidthUnit,
): EditorDocxWidthValue | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return unit === "percent" ? `${parsed}%` : parsed;
}

export function resolveBorder(
  style: BorderStyleValue,
  widthValue: string,
  colorValue: string,
): EditorBorderStyle | null {
  if (style === "none") return null;
  const width = parseNumber(widthValue);
  return {
    type: style,
    width: width !== null && width > 0 ? width : DEFAULT_BORDER_WIDTH_PT,
    color: colorValue.trim() || DEFAULT_BORDER_COLOR,
  };
}

/** Fresh store with empty/default values, used before the dialog opens. */
export function createDefaultFormState(): TableFormState {
  return {
    activeTab: "table",
    tableWidth: "",
    tableWidthUnit: "points",
    tableAlign: "",
    tableIndentLeft: "",
    tableWrapping: "none",
    floatingHorizontalAnchor: "margin",
    floatingVerticalAnchor: "text",
    floatingX: "",
    floatingY: "",
    floatingXAlign: "",
    floatingYAlign: "",
    floatingDistanceTop: "",
    floatingDistanceRight: "",
    floatingDistanceBottom: "",
    floatingDistanceLeft: "",
    floatingOverlap: "overlap",
    rowHeight: "",
    rowHeightRule: "",
    repeatHeader: false,
    allowBreakAcrossPages: true,
    hiddenRow: false,
    columnWidth: "",
    cellWidth: "",
    cellVerticalAlign: "",
    cellTextDirection: "",
    cellNoWrap: false,
    cellFitText: false,
    cellHideMark: false,
    marginTop: "",
    marginRight: "",
    marginBottom: "",
    marginLeft: "",
    borderStyle: "none",
    borderWidth: "",
    borderColor: "",
    borderTop: false,
    borderRight: false,
    borderBottom: false,
    borderLeft: false,
    borderStart: false,
    borderEnd: false,
    borderTlBr: false,
    borderTrBl: false,
    shading: "",
    altTitle: "",
    altDescription: "",
  };
}

/** Maps the public initial-values shape onto the internal store shape. */
export function formStateFromInitial(
  initial: TablePropertiesDialogInitialValues,
): TableFormState {
  return {
    activeTab: initial.activeTab ?? "table",
    tableWidth: initial.tableWidth,
    tableWidthUnit: initial.tableWidthUnit,
    tableAlign: initial.tableAlign,
    tableIndentLeft: initial.tableIndentLeft,
    tableWrapping: initial.tableWrapping,
    floatingHorizontalAnchor: initial.floatingHorizontalAnchor,
    floatingVerticalAnchor: initial.floatingVerticalAnchor,
    floatingX: initial.floatingX,
    floatingY: initial.floatingY,
    floatingXAlign: initial.floatingXAlign,
    floatingYAlign: initial.floatingYAlign,
    floatingDistanceTop: initial.floatingDistanceTop,
    floatingDistanceRight: initial.floatingDistanceRight,
    floatingDistanceBottom: initial.floatingDistanceBottom,
    floatingDistanceLeft: initial.floatingDistanceLeft,
    floatingOverlap: initial.floatingOverlap,
    rowHeight: initial.rowHeight,
    rowHeightRule: initial.rowHeightRule,
    repeatHeader: initial.repeatHeader,
    allowBreakAcrossPages: initial.allowBreakAcrossPages,
    hiddenRow: initial.hiddenRow,
    columnWidth: initial.columnWidth,
    cellWidth: initial.cellWidth,
    cellVerticalAlign: initial.cellVerticalAlign,
    cellTextDirection: initial.cellTextDirection,
    cellNoWrap: initial.cellNoWrap,
    cellFitText: initial.cellFitText,
    cellHideMark: initial.cellHideMark,
    marginTop: initial.marginTop,
    marginRight: initial.marginRight,
    marginBottom: initial.marginBottom,
    marginLeft: initial.marginLeft,
    borderStyle: initial.borderStyle,
    borderWidth: initial.borderWidth,
    borderColor: initial.borderColor,
    borderTop: initial.borderTop,
    borderRight: initial.borderRight,
    borderBottom: initial.borderBottom,
    borderLeft: initial.borderLeft,
    borderStart: initial.borderStart,
    borderEnd: initial.borderEnd,
    borderTlBr: initial.borderTopLeftToBottomRight,
    borderTrBl: initial.borderTopRightToBottomLeft,
    shading: initial.shading,
    altTitle: initial.altTitle,
    altDescription: initial.altDescription,
  };
}

/** Pure projection from the internal store to the public apply-values shape. */
export function buildTableApplyValues(
  form: TableFormState,
): TablePropertiesDialogApplyValues {
  const border = resolveBorder(
    form.borderStyle,
    form.borderWidth,
    form.borderColor,
  );
  return {
    tableWidth: parseWidth(form.tableWidth, form.tableWidthUnit),
    tableAlign: form.tableAlign || null,
    tableIndentLeft: parseWidth(form.tableIndentLeft, "points"),
    tableFloating:
      form.tableWrapping === "around"
        ? {
            horizontalAnchor: form.floatingHorizontalAnchor,
            verticalAnchor: form.floatingVerticalAnchor,
            ...(form.floatingXAlign
              ? {
                  xAlign: form.floatingXAlign as NonNullable<
                    EditorTableFloatingLayout["xAlign"]
                  >,
                }
              : { x: parseNumber(form.floatingX) ?? 0 }),
            ...(form.floatingYAlign
              ? {
                  yAlign: form.floatingYAlign as NonNullable<
                    EditorTableFloatingLayout["yAlign"]
                  >,
                }
              : { y: parseNumber(form.floatingY) ?? 0 }),
            distanceTop: parseNumber(form.floatingDistanceTop) ?? 0,
            distanceRight: parseNumber(form.floatingDistanceRight) ?? 0,
            distanceBottom: parseNumber(form.floatingDistanceBottom) ?? 0,
            distanceLeft: parseNumber(form.floatingDistanceLeft) ?? 0,
          }
        : null,
    tableOverlap: form.tableWrapping === "around" ? form.floatingOverlap : null,
    rowHeight: parseWidth(form.rowHeight, "points"),
    rowHeightRule: form.rowHeightRule || null,
    repeatHeader: form.repeatHeader,
    cantSplit: !form.allowBreakAcrossPages,
    hiddenRow: form.hiddenRow,
    columnWidth: parseWidth(form.columnWidth, "points"),
    cellWidth: parseWidth(form.cellWidth, "points"),
    cellVerticalAlign: form.cellVerticalAlign || null,
    cellTextDirection: form.cellTextDirection || null,
    cellNoWrap: form.cellNoWrap,
    cellFitText: form.cellFitText,
    cellHideMark: form.cellHideMark,
    margins: {
      top: parseNumber(form.marginTop),
      right: parseNumber(form.marginRight),
      bottom: parseNumber(form.marginBottom),
      left: parseNumber(form.marginLeft),
    },
    borders: {
      top: form.borderTop ? border : null,
      right: form.borderRight ? border : null,
      bottom: form.borderBottom ? border : null,
      left: form.borderLeft ? border : null,
      start: form.borderStart ? border : null,
      end: form.borderEnd ? border : null,
      topLeftToBottomRight: form.borderTlBr ? border : null,
      topRightToBottomLeft: form.borderTrBl ? border : null,
    },
    shading: form.shading.trim() || null,
    altTitle: form.altTitle.trim() || null,
    altDescription: form.altDescription.trim() || null,
  };
}

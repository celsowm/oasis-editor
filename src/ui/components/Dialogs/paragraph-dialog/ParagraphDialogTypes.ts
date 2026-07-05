import type {
  EditorBorderStyle,
  EditorParagraphStyle,
  EditorTabStop,
} from "@/core/model.js";

export type SpecialIndent = "none" | "firstLine" | "hanging";
export type BorderStyleValue = "none" | "solid" | "dashed" | "dotted";
export type LineRuleValue = "auto" | "exact" | "atLeast" | null;
export type LineSpacingMode =
  | "single"
  | "onePointFive"
  | "double"
  | "multiple"
  | "atLeast"
  | "exact";

/** Word's pt-based "At" values are stored as px for exact/atLeast line rules. */
export const PT_TO_PX = 96 / 72;

export const DEFAULT_BORDER_WIDTH_PT = 0.5;
export const DEFAULT_BORDER_COLOR = "#000000";
export const OUTLINE_BODY = "";

export interface ParagraphDialogInitialValues {
  align: string;
  indentLeft: string;
  indentRight: string;
  indentFirstLine: string;
  indentHanging: string;
  mirrorIndents: boolean;
  spacingBefore: string;
  spacingAfter: string;
  lineHeight: string;
  lineRule: string;
  contextualSpacing: boolean;
  outlineLevel: string;
  shading: string;
  borderStyle: string;
  borderWidth: string;
  borderColor: string;
  borderSideTop: boolean;
  borderSideRight: boolean;
  borderSideBottom: boolean;
  borderSideLeft: boolean;
  pageBreakBefore: boolean;
  keepWithNext: boolean;
  keepLinesTogether: boolean;
  widowControl: boolean;
  tabs: EditorTabStop[];
}

export interface ParagraphDialogBorders {
  top: EditorBorderStyle | null;
  right: EditorBorderStyle | null;
  bottom: EditorBorderStyle | null;
  left: EditorBorderStyle | null;
}

export interface ParagraphDialogApplyValues {
  align: EditorParagraphStyle["align"] | null;
  indentLeft: number | null;
  indentRight: number | null;
  indentFirstLine: number | null;
  indentHanging: number | null;
  mirrorIndents: boolean;
  spacingBefore: number | null;
  spacingAfter: number | null;
  lineHeight: number | null;
  lineRule: LineRuleValue;
  contextualSpacing: boolean;
  outlineLevel: number | null;
  shading: string | null;
  /**
   * Per-edge paragraph borders. The dialog edits one shared style/width/color
   * and toggles which edges carry it; each edge is the shared border or `null`.
   */
  borders: ParagraphDialogBorders;
  pageBreakBefore: boolean;
  keepWithNext: boolean;
  keepLinesTogether: boolean;
  widowControl: boolean;
  tabs: EditorTabStop[];
}

export interface ParagraphDialogProps {
  isOpen: boolean;
  initial: ParagraphDialogInitialValues;
  onClose: () => void;
  onApply: (
    values: ParagraphDialogApplyValues,
    original: ParagraphDialogInitialValues,
  ) => void;
  /** Persist the current values onto the default paragraph style. */
  onSetDefault?: (values: ParagraphDialogApplyValues) => void;
}

/** Map the model's `lineRule` + `lineHeight` onto a Word line-spacing mode. */
export function deriveLineSpacing(
  lineRule: string,
  lineHeight: number | null,
): { mode: LineSpacingMode; at: number | null } {
  if (lineRule === "exact" || lineRule === "atLeast") {
    const pt = lineHeight !== null ? Math.round(lineHeight / PT_TO_PX) : null;
    return { mode: lineRule, at: pt };
  }
  if (lineHeight === null) return { mode: "multiple", at: null };
  if (lineHeight === 1) return { mode: "single", at: null };
  if (lineHeight === 1.5) return { mode: "onePointFive", at: null };
  if (lineHeight === 2) return { mode: "double", at: null };
  return { mode: "multiple", at: lineHeight };
}

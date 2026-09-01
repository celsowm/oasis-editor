import type {
  EditorDocumentDesign,
  EditorImageBorder,
  EditorPageBorder,
  EditorPageMargins,
  EditorWatermark,
} from "@/core/model.js";
import type { DesignThemeId } from "@/core/commands/design.js";
import type { ImageBorderPatch } from "@/core/commands/image.js";
import type { TextCaseMode } from "@/core/commands/text.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";
import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type { TableBorderPreset } from "@/core/commands/table.js";
import type { EditorMathExpression } from "@/core/model.js";

// Capability contracts the Essentials plugin operates on. Extracted to a leaf
// module so `createEssentialsPlugin` (which builds the plugin) and
// `essentialsCommandGroups` (which builds command groups against these types)
// can both depend on them without importing each other.

export interface EssentialsFeatureGate {
  isCommandEnabled: (commandName: OasisBuiltinCommand) => boolean;
}

export interface EssentialsStyleCapability {
  state: () => ToolbarStyleState;
}

export interface EssentialsSelectionCapability {
  isCollapsed: () => boolean;
}

export interface EssentialsHistoryCapability {
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => boolean;
  redo: () => boolean;
}

export interface EssentialsFormattingCapability {
  selectAll: () => boolean;
  insertFootnote: () => boolean;
  insertText: (text: string, fontFamily?: string | null) => boolean;
  insertEquation: (expression: EditorMathExpression) => boolean;
  updateEquation: (runId: string, expression: EditorMathExpression) => boolean;
  pastePlainText: () => boolean;
  bold: () => boolean;
  italic: () => boolean;
  underline: () => boolean;
  strike: () => boolean;
  superscript: () => boolean;
  subscript: () => boolean;
  alignLeft: () => boolean;
  alignCenter: () => boolean;
  alignRight: () => boolean;
  alignJustify: () => boolean;
  orderedList: () => boolean;
  bulletList: () => boolean;
  find: () => boolean;
  replace: () => boolean;
  toggleTrackChanges: () => boolean;
  acceptRevisions: () => boolean;
  rejectRevisions: () => boolean;
  toggleShowMargins: () => boolean;
  toggleShowParagraphMarks: () => boolean;
  togglePreciseFonts: () => boolean;
  pageBreak: () => boolean;
  lineBreak: () => boolean;
  splitBlock: () => boolean;
  setFontFamily: (value: string | null) => boolean;
  setFontSize: (value: number | null) => boolean;
  increaseFontSize: () => boolean;
  decreaseFontSize: () => boolean;
  changeTextCase: (mode: TextCaseMode) => boolean;
  clearFormatting: () => boolean;
  setColor: (value: string | null) => boolean;
  setHighlight: (value: string | null) => boolean;
  setTextShading: (value: string | null) => boolean;
  setStyleId: (value: string) => boolean;
  setCharacterStyleId: (value: string) => boolean;
  setUnderlineStyle: (value: string | null) => void;
}

export interface EssentialsDocumentStyleDescriptor {
  id: string;
  name: string;
  type: "paragraph" | "character" | "table";
  qFormat?: boolean;
  uiPriority?: number;
  semiHidden?: boolean;
  unhideWhenUsed?: boolean;
  isUsed?: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  tablePreview?: {
    wholeFill?: string;
    headerFill?: string;
    bandFill?: string;
    borderColor?: string;
    headerColor?: string;
  };
}

export interface EssentialsDocumentCapability {
  documentStyles: () => EssentialsDocumentStyleDescriptor[];
  newDocument: () => void;
  exportDocx: () => void;
  exportPdf: () => void;
  importDocument: () => void;
  insertImage: () => void;
  insertShape: (preset: string) => void;
  openSymbolDialog: () => void;
  openEquationDialog: () => void;
}

export interface EssentialsLinkCapability {
  prompt: () => void;
  remove: () => void;
  canPrompt: () => boolean;
}

export interface EssentialsImageCapability {
  promptAlt: () => void;
  promptCaption: () => void;
  isSelected: () => boolean;
  /** Displayed size of the selected image in centimetres, or `null`. */
  getSizeCm: () => { width: number; height: number } | null;
  /** Set the displayed width (cm), scaling height to keep the aspect ratio. */
  setWidthCm: (cm: number) => void;
  /** Set the displayed height (cm), scaling width to keep the aspect ratio. */
  setHeightCm: (cm: number) => void;
  /** Whether interactive crop mode is currently active. */
  isCropActive: () => boolean;
  /** Toggle interactive crop mode for the selected image. */
  toggleCrop: () => void;
  /** Apply an aspect-ratio crop preset (e.g. "16:9", "1:1", "reset"). */
  applyCropAspect: (preset: string) => void;
  /** Current DrawingML picture mask preset, or `null` for a rectangle. */
  getCropShape: () => string | null;
  /** Apply/remove a DrawingML picture mask preset. */
  applyCropShape: (preset: string) => void;
  /** Fill the current picture frame by cropping the source. */
  applyCropFill: () => void;
  /** Fit the complete source image inside the current picture frame. */
  applyCropFit: () => void;
  /** Clear source crop, fit/fill mode and picture mask. */
  resetCrop: () => void;
  /** Outline of the selected image (`pic:spPr/a:ln`), or `null`. */
  getBorder: () => EditorImageBorder | null;
  /** Merge a partial outline edit; `{ color: null }` removes the outline. */
  setBorder: (patch: ImageBorderPatch) => void;
}

export interface EssentialsBrowserCapability {
  print: () => void;
  copy: () => void;
}

export interface EssentialsParagraphCapability {
  togglePageBreakBefore: () => void;
  toggleKeepWithNext: () => void;
  setSpacingAfter: (value: number | null) => void;
  setSpacingBefore: (value: number | null) => void;
  setIndentLeft: (value: number | null) => void;
  setIndentRight: (value: number | null) => void;
  setIndentFirstLine: (value: number | null) => void;
  setIndentHanging: (value: number | null) => void;
  setSpecialIndent: (
    kind: "none" | "firstLine" | "hanging",
    value?: number | null,
  ) => void;
  setShading: (value: string | null) => void;
  applyBorders: () => void;
  setLineHeight: (value: number | null) => void;
  setListFormat: (format: string) => void;
  setListStartAt: (value: number | null) => void;
  outdent: () => void;
  indent: () => void;
}

export interface EssentialsSectionCapability {
  isLandscape: () => boolean;
  toggleOrientation: () => void;
  setOrientation: (orientation: "portrait" | "landscape") => void;
  breakNextPage: () => void;
  breakContinuous: () => void;
  getMargins: () => EditorPageMargins | undefined;
  setPageMargins: (margins: Partial<EditorPageMargins>) => void;
}

export interface EssentialsDesignCapability {
  applyTheme: (theme: DesignThemeId) => void;
  setColorScheme: (value: string) => void;
  setFontScheme: (value: string) => void;
  setParagraphSpacing: (
    value: NonNullable<EditorDocumentDesign["paragraphSpacingId"]>,
  ) => void;
  setEffects: (value: string) => void;
  setPageColor: (value: string | null) => void;
  setWatermark: (value: EditorWatermark | null) => void;
  setPageBorder: (value: EditorPageBorder | null) => void;
  setDefault: () => void;
  getDesign: () => EditorDocumentDesign | undefined;
  getPageBorder: () => EditorPageBorder | null | undefined;
}

/** Which `w:tblLook` conditional-formatting option a toggle command controls. */
export type TableLookFlag =
  | "firstRow"
  | "lastRow"
  | "firstCol"
  | "lastCol"
  | "bandedRows"
  | "bandedCols";

/** Resolved on/off state of every tblLook option for the selected table. */
export type TableLookState = Record<TableLookFlag, boolean>;

export interface EssentialsTableCapability {
  insideTable: () => boolean;
  selectionLabel: () => string | null;
  /** Resolved tblLook option state for the selected table (null if none). */
  getTblLook: () => TableLookState | null;
  /** Flip one tblLook option on the selected table. */
  toggleTblLook: (flag: TableLookFlag) => void;
  /** Named table-style id currently applied to the selected table. */
  getStyleId: () => string | null;
  /** Apply a named table style to the selected table (empty clears it). */
  setStyleId: (styleId: string) => void;
  /** Sizing mode of the selected table (`fixed`/`autofit`, null if none). */
  getLayout: () => "fixed" | "autofit" | null;
  /** Toggle the selected table between fixed and autofit sizing. */
  toggleAutoFit: () => void;
  /** Equalize the widths of every column in the selected table. */
  distributeColumns: () => void;
  /** Equalize the heights of every row in the selected table. */
  distributeRows: () => void;
  canMerge: () => boolean;
  canSplit: () => boolean;
  canEditColumn: () => boolean;
  canEditRow: () => boolean;
  merge: () => void;
  split: () => void;
  insertColumnBefore: () => void;
  insertColumnAfter: () => void;
  deleteColumn: () => void;
  insertRowBefore: () => void;
  insertRowAfter: () => void;
  deleteRow: () => void;
  cellShading: (color: string | null) => void;
  cellBorders: () => void;
  cellNoBorders: () => void;
  applyBorderPreset: (preset: TableBorderPreset) => void;
  isDrawingBorders: () => boolean;
  toggleDrawingBorders: () => void;
  isShowingGridlines: () => boolean;
  toggleGridlines: () => void;
  width100: () => void;
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  setCellWidth: (width: string) => void;
  insert: (rows: number, cols: number) => void;
}

export interface EssentialsPluginDeps {
  gate: EssentialsFeatureGate;
  style: EssentialsStyleCapability;
  selection: EssentialsSelectionCapability;
  history: EssentialsHistoryCapability;
  formatting: EssentialsFormattingCapability;
  document: EssentialsDocumentCapability;
  link: EssentialsLinkCapability;
  image: EssentialsImageCapability;
  browser: EssentialsBrowserCapability;
  paragraph: EssentialsParagraphCapability;
  section: EssentialsSectionCapability;
  table: EssentialsTableCapability;
  design: EssentialsDesignCapability;
}

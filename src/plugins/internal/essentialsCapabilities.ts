import type {
  EditorColumnsSettings,
  EditorDocumentDesign,
  EditorImageBorder,
  EditorPageBorder,
  EditorPageMargins,
  EditorPageNumbering,
  EditorPosition,
  EditorWatermark,
} from "@/core/model.js";
import type { SectionPageNumberFormat } from "@/core/commands/pageNumber.js";
import type { CrossReferenceType } from "@/core/commands/crossReference.js";
import type { DesignThemeId } from "@/core/commands/design.js";
import type { ImageBorderPatch } from "@/core/commands/image.js";
import type { TextCaseMode } from "@/core/commands/text.js";
import type { SpecialCharacterKind } from "@/core/commands/specialChar.js";
import type { ReplaceAllPayload } from "@/core/commands/publicCommandTypes.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";
import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type { TableBorderPreset } from "@/core/commands/table.js";
import type {
  TableCellMargins,
  TableRowHeight,
} from "@/core/commands/table.js";
import type { EditorMathExpression, EditorTabStop } from "@/core/model.js";

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
  selectWord: () => boolean;
  selectSentence: () => boolean;
  selectParagraph: () => boolean;
  /** Collapse the selection to its start (or end when `end` is true). */
  selectCollapse: (end?: boolean) => boolean;
  /** Select the Nth occurrence of a search string (literal, case-insensitive). */
  selectText: (text: string, occurrence?: number) => boolean;
  /** Select an arbitrary range by anchor/focus positions (select.range). */
  selectRange: (anchor: EditorPosition, focus: EditorPosition) => boolean;
  insertFootnote: () => boolean;
  /** Set document-wide footnote/endnote options (references.noteOptions). */
  setNoteOptions: (options: {
    kind: "footnote" | "endnote";
    numberFormat?: string | null;
    startAt?: number | null;
    restart?: string | null;
  }) => void;
  /** Read the footnote or endnote options in effect. */
  getNoteOptions: (kind: "footnote" | "endnote") => {
    numberFormat?: string;
    startAt?: number;
    restart?: string;
  };
  insertTableOfContents: () => boolean;
  updateTableOfContents: () => boolean;
  /** True only when the active section contains an updateable TOC field. */
  hasTableOfContents: () => boolean;
  /** True when the current selection intersects revisions this command can resolve. */
  hasRevisionsInSelection: () => boolean;
  /** True when the whole document contains any resolvable tracked revision. */
  hasRevisionsInDocument: () => boolean;
  hasNavigableRevisions: () => boolean;
  hasNavigableComments: () => boolean;
  canCreateComment: () => boolean;
  canReplyToComment: () => boolean;
  newComment: () => boolean;
  replyComment: () => boolean;
  editComment: () => boolean;
  canEditComment: () => boolean;
  toggleCommentsPanel: () => boolean;
  isCommentsPanelOpen: () => boolean;
  navigateRevisionNext: () => boolean;
  navigateRevisionPrevious: () => boolean;
  navigateCommentNext: () => boolean;
  navigateCommentPrevious: () => boolean;
  hasSelectedComment: () => boolean;
  isSelectedCommentResolved: () => boolean;
  resolveSelectedComment: () => boolean;
  reopenSelectedComment: () => boolean;
  deleteSelectedComment: () => boolean;
  canDeleteSelectedComment: () => boolean;
  canManageSelectedComment: () => boolean;
  insertText: (text: string, fontFamily?: string | null) => boolean;
  insertEquation: (expression: EditorMathExpression) => boolean;
  updateEquation: (runId: string, expression: EditorMathExpression) => boolean;
  pastePlainText: () => boolean;
  formatPainterOnce: () => boolean;
  formatPainterContinuous: () => boolean;
  cancelFormatPainter: () => boolean;
  formatPainterMode: () => "once" | "continuous" | null;
  canCaptureFormatPainter: () => boolean;
  bold: () => boolean;
  italic: () => boolean;
  underline: () => boolean;
  doubleUnderline: () => boolean;
  wordUnderline: () => boolean;
  strike: () => boolean;
  doubleStrike: () => boolean;
  smallCaps: () => boolean;
  allCaps: () => boolean;
  hidden: () => boolean;
  toggleCharacterBorder: () => boolean;
  shadow: () => boolean;
  emboss: () => boolean;
  engrave: () => boolean;
  outline: () => boolean;
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
  replaceAll: (payload: ReplaceAllPayload) => boolean;
  toggleTrackChanges: () => boolean;
  /** Reactive document view/state flags for Ribbon toggle feedback. */
  isTrackChangesEnabled: () => boolean;
  areMarginsVisible: () => boolean;
  areParagraphMarksVisible: () => boolean;
  acceptRevisions: () => boolean;
  rejectRevisions: () => boolean;
  acceptAllRevisions: () => boolean;
  rejectAllRevisions: () => boolean;
  toggleShowMargins: () => boolean;
  toggleShowParagraphMarks: () => boolean;
  togglePreciseFonts: () => boolean;
  pageBreak: () => boolean;
  lineBreak: () => boolean;
  columnBreak: () => boolean;
  splitBlock: () => boolean;
  /** Insert a single special character (WordCraft `text.*` symbols). */
  insertSpecialChar: (kind: SpecialCharacterKind) => boolean;
  setFontFamily: (value: string | null) => boolean;
  setFontSize: (value: number | null) => boolean;
  increaseFontSize: () => boolean;
  decreaseFontSize: () => boolean;
  /** Nudge the selection font size up by exactly 1 point (format.growFont1). */
  growFont1: () => boolean;
  /** Nudge the selection font size down by exactly 1 point (format.shrinkFont1). */
  shrinkFont1: () => boolean;
  changeTextCase: (mode: TextCaseMode) => boolean;
  clearFormatting: () => boolean;
  setColor: (value: string | null) => boolean;
  setHighlight: (value: string | null) => boolean;
  setTextShading: (value: string | null) => boolean;
  setStyleId: (value: string) => boolean;
  setCharacterStyleId: (value: string) => boolean;
  setUnderlineStyle: (value: string | null) => void;
  setUnderlineColor: (value: string | null) => boolean;
  setCharacterScale: (value: number | null) => boolean;
  setCharacterSpacing: (value: number | null) => boolean;
  setBaselineShift: (value: number | null) => boolean;
  setEmphasisMark: (value: string | null) => boolean;
  /** Set kerning threshold in pt (character-level, w:kern). */
  setKerning: (value: number | null) => boolean;
  /** Set ligature style (character-level, w14:ligatures). */
  setLigatures: (value: string | null) => boolean;
  /** Set number spacing (default/proportional/tabular). */
  setNumberSpacing: (value: string | null) => boolean;
  /** Set number form (default/lining/oldStyle). */
  setNumberForm: (value: string | null) => boolean;
  /** Set stylistic set (1-20; character-level, w14:stylisticSets). */
  setStylisticSet: (value: number | null) => boolean;
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
  printDocument: () => void;
  importDocument: () => void;
  insertHtml: (html: string) => void;
  insertImage: () => void;
  insertShape: (preset: string) => void;
  openSymbolDialog: () => void;
  openEquationDialog: () => void;
  /** True when the active selection sits inside a table. */
  hasActiveTable: () => boolean;
  /** Opens the Table Properties dialog for the active table/cell. */
  openTableProperties: (activeTab?: "table" | "cell") => void;
  /** Set the selected shape's solid fill (`null` clears/transparent). */
  setShapeFill: (fill: string | null) => void;
  /** Set the selected shape's outline color (`null` removes it). */
  setShapeOutline: (color: string | null) => void;
  /** Set the selected shape's outline width in points. */
  setShapeOutlineWidth: (widthPt: number) => void;
  /** Align the selected floating object (image/text box) to the margin. */
  alignFloatingObject: (align: "left" | "center" | "right") => void;
  /** Bring the selected floating object to the front or behind the text. */
  reorderFloatingObject: (move: "front" | "back") => void;
  /** Nudge the selected floating object by a pixel delta. */
  nudgeFloatingObject: (dx: number, dy: number) => void;
  /** Set whether the selected floating object moves with text / is pinned to page. */
  setFloatingFixedPosition: (fixed: boolean) => void;
  /** Set the exact rotation (degrees, clockwise) of the selected floating object. */
  setFloatingRotation: (degrees: number) => void;
  /** Set the text-wrap preset of the selected floating object. */
  setFloatingWrapPreset: (
    preset:
      | "inline"
      | "square"
      | "tight"
      | "through"
      | "topAndBottom"
      | "behind"
      | "front",
  ) => void;
  /** Set which side(s) of the selected Square/Tight/Through object text flows on. */
  setFloatingWrapText: (
    side: "bothSides" | "left" | "right" | "largest",
  ) => void;
  /** Move the selected floating object to a preset page position. */
  setFloatingPositionPreset: (
    preset:
      | "topLeft"
      | "topCenter"
      | "topRight"
      | "middleLeft"
      | "middleCenter"
      | "middleRight"
      | "bottomLeft"
      | "bottomCenter"
      | "bottomRight",
  ) => void;
  /** Change the selected shape's DrawingML preset geometry. */
  setShapePreset: (preset: string) => void;
  /** Set the selected text box's text-direction flow. */
  setTextBoxTextDirection: (
    dir: "horz" | "vert" | "vert270" | "wordArtVert",
  ) => void;
  /** Set the selected text box's vertical text alignment. */
  setTextBoxVerticalAlign: (anchor: "t" | "ctr" | "b") => void;
  /** Set the selected text box's accessibility alt text. */
  setTextBoxAlt: (alt: string | null) => void;
  /** Rotate the selected text box left or right by a fixed step. */
  rotateTextBox: (direction: "left" | "right") => void;
  /** True when a text box is selected and can be resized. */
  isTextBoxSelected: () => boolean;
  /** The selected text box's displayed size in cm, or `null`. */
  getTextBoxSizeCm: () => { width: number; height: number } | null;
  /** Set the selected text box width (cm), keeping its height. */
  setTextBoxWidthCm: (cm: number) => void;
  /** Set the selected text box height (cm), keeping its width. */
  setTextBoxHeightCm: (cm: number) => void;
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
  /** Flip the selected image about its horizontal or vertical axis. */
  flip: (axis: "horizontal" | "vertical") => void;
  /** Rotate the selected image left or right by a fixed step. */
  rotate: (direction: "left" | "right") => void;
  /** Transparency (0..1) of the selected picture, or `null` when unselected. */
  getTransparency: () => number | null;
  /** Set the selected picture's transparency (0..1); 0 restores full opacity. */
  setTransparency: (transparency: number | null) => void;
  /** Restore the selected picture to its original state (drops adjustments). */
  reset: () => void;
  /** True when a picture is selected and can be reset. */
  canReset: () => boolean;
}

export interface EssentialsBrowserCapability {
  cut: () => void;
  canCut: () => boolean;
  paste: () => void;
  pasteAsPlainText: () => void;
  pasteMergeFormatting: () => void;
  canPaste: () => boolean;
  copy: () => void;
  hasSelection: () => boolean;
}

export interface EssentialsParagraphCapability {
  togglePageBreakBefore: () => void;
  toggleKeepWithNext: () => void;
  toggleKeepLinesTogether: () => void;
  toggleWidowControl: () => void;
  setSpacingAfter: (value: number | null) => void;
  setSpacingBefore: (value: number | null) => void;
  /** Set the line spacing rule (auto/exact/atLeast, w:lineRule). */
  setLineRule: (rule: "auto" | "exact" | "atLeast" | null) => void;
  /** Set the paragraph text flow (w:textDirection, vertical text). */
  setTextDirection: (direction: string | null) => void;
  /** Set "Don't hyphenate" (w:suppressAutoHyphens). */
  setSuppressAutoHyphens: (value: boolean | null) => void;
  /** Set "Use kinsoku rules for East Asian line breaking" (w:kinsoku, default on). */
  setKinsoku: (value: boolean | null) => void;
  /** Set "Allow punctuation to overflow margin" (w:overflowPunct, default on). */
  setOverflowPunct: (value: boolean | null) => void;
  /** Set "Allow Latin text to wrap in the middle of a word" (w:wordWrap, default on). */
  setWordWrap: (value: boolean | null) => void;
  /** Set "Automatically adjust spacing between East Asian and Latin text" (w:autoSpaceDE, default on). */
  setAutoSpaceDE: (value: boolean | null) => void;
  /** Set "Automatically adjust spacing between East Asian text and numbers" (w:autoSpaceDN, default on). */
  setAutoSpaceDN: (value: boolean | null) => void;
  /** Set "Adjust right indent when grid is defined" (w:adjustRightInd, default on). */
  setAdjustRightInd: (value: boolean | null) => void;
  /** Set "Compress punctuation at start of a line" (w:topLinePunct). */
  setTopLinePunct: (value: boolean | null) => void;
  /** Set "Don't add space between paragraphs of the same style" (w:contextualSpacing). */
  setContextualSpacing: (value: boolean | null) => void;
  /** Set "Mirror indents" (w:mirrorIndents): swap left/right indents on facing pages. */
  setMirrorIndents: (value: boolean | null) => void;
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
  /** Apply a horizontal line (single 1.5pt bottom border) to the selection. */
  addHorizontalLine: () => void;
  setLineHeight: (value: number | null) => void;
  setListFormat: (format: string) => void;
  setListStartAt: (value: number | null) => void;
  /** Set the selected list paragraphs' explicit list level (0-8, WordCraft para.listLevel). */
  setListLevel: (level: number) => void;
  outdent: () => void;
  indent: () => void;
  /** Outline-step the click (WordCraft para.promote): heading up one level, body→preceding heading, list item one level up. */
  promote: () => void;
  /** Outline-step down (WordCraft para.demote): heading down one level, list item one level down; body text refused. */
  demote: () => void;
  /** Reset paragraph formatting (WordCraft para.reset): clear direct paragraph formatting, keeping the named style, list and drop cap. */
  resetParagraphFormatting: () => void;
  /** Edit the selected paragraphs' tab stops and default interval (WordCraft para.tabs). */
  setTabStops: (change: {
    tabs?: EditorTabStop[] | null;
    set?: EditorTabStop[];
    clear?: number[];
    clearAll?: boolean;
    default?: number | null;
  }) => void;
  /** Set the selected paragraphs' outline level (0-8, w:outlineLvl) or return to body text (null). */
  setOutlineLevel: (level: number | null) => void;
  /** Move the selected paragraphs one step up/down, if possible. */
  moveParagraphsUp: () => void;
  moveParagraphsDown: () => void;
  /** True when the selected paragraph run can move in the given direction. */
  canMoveParagraphsUp: () => boolean;
  canMoveParagraphsDown: () => boolean;
  /** Set the selected paragraphs' flow direction (w:bidi, right-to-left). */
  setBidi: (enabled: boolean | null) => void;
  /** Sort the selected paragraph run (natural order), ascending unless descending. */
  sortParagraphs: (descending?: boolean) => void;
  /** Whether any selected paragraph carries a drop cap (insert.dropCap). */
  hasDropCap: () => boolean;
  /** Set/clear a drop cap on the selected paragraphs (insert.dropCap). */
  setDropCap: (options: {
    text?: string;
    lines?: number;
    type?: "drop" | "margin" | "none";
    font?: string;
  }) => void;
}

export interface EssentialsSectionCapability {
  isLandscape: () => boolean;
  toggleOrientation: () => void;
  setOrientation: (orientation: "portrait" | "landscape") => void;
  breakNextPage: () => void;
  breakContinuous: () => void;
  /** Insert a section break that begins the next section on an even page. */
  breakEvenPage: () => void;
  /** Insert a section break that begins the next section on an odd page. */
  breakOddPage: () => void;
  /** Insert a section break that begins the next section in a new column. */
  breakNextColumn: () => void;
  getMargins: () => EditorPageMargins | undefined;
  setPageMargins: (margins: Partial<EditorPageMargins>) => void;
  /** Apply a named page-margin preset (normal/narrow/moderate/wide/mirrored). */
  setMarginsPreset: (presetId: string) => void;
  getPageNumbering: () => EditorPageNumbering | undefined;
  setPageNumbering: (numbering: {
    start?: number;
    format?: SectionPageNumberFormat;
  }) => void;
  getPaperSize: () => { widthPt: number; heightPt: number } | undefined;
  setPaperSize: (dimensions: { widthPt: number; heightPt: number }) => void;
  setPaperSizePreset: (presetId: string) => void;
  getColumns: () => EditorColumnsSettings | undefined;
  setColumns: (columns: {
    count: number;
    space?: number;
    separator?: boolean;
  }) => void;
  /** Read the active section's vertical justification (`w:vAlign`). */
  getVerticalAlign: () => "top" | "center" | "both" | "bottom" | undefined;
  /** Set the active section's vertical justification (`w:vAlign`). */
  setVerticalAlign: (align: "top" | "center" | "both" | "bottom") => void;
  /** Read the active section's right-to-left layout flag (`w:bidi`). */
  getBidi: () => boolean | undefined;
  /** Set the active section's right-to-left layout flag (`w:bidi`). */
  setBidi: (enabled: boolean) => void;
  /** Read the document's automatic hyphenation settings (layout.hyphenation). */
  getHyphenation: () => {
    value: boolean;
    zone?: number;
    caps?: boolean;
    limit?: number;
  };
  /** Set the document's automatic hyphenation settings (layout.hyphenation). */
  setHyphenation: (input: {
    value?: boolean;
    zone?: number;
    caps?: boolean;
    limit?: number;
  }) => void;
}

export interface EssentialsHeaderFooterCapability {
  /** Enter header editing for the active section's default header. */
  editHeader: () => void;
  /** Enter footer editing for the active section's default footer. */
  editFooter: () => void;
  /** Enter header editing for the active section's first-page header. */
  editFirstPageHeader: () => void;
  /** Enter header editing for the active section's even-page header. */
  editEvenPageHeader: () => void;
  /** Enter footer editing for the active section's first-page footer. */
  editFirstPageFooter: () => void;
  /** Enter footer editing for the active section's even-page footer. */
  editEvenPageFooter: () => void;
  /** Insert a PAGE field at the active caret (header, footer or body). */
  insertPageNumber: () => void;
  /** Insert a "Page X of Y" combination (PAGE + NUMPAGES) at the caret. */
  insertPageNumberXOfY: () => void;
  /** Place the active section's default header page number (aligned). */
  placePageNumberTop: () => void;
  /** Place the active section's default footer page number (aligned). */
  placePageNumberBottom: () => void;
  /** Return the caret to the main body, leaving header/footer editing. */
  exit: () => void;
  /** Whether the caret currently edits a header or footer zone. */
  isInHeaderFooter: () => boolean;
  /** Whether the active section uses a different first-page header/footer. */
  getDifferentFirstPage: () => boolean;
  /** Set the active section's different-first-page header/footer flag. */
  setDifferentFirstPage: (on: boolean) => void;
  /** Whether the active section uses different odd & even pages. */
  getDifferentOddEven: () => boolean;
  /** Set the active section's different odd & even pages flag. */
  setDifferentOddEven: (on: boolean) => void;
}

export interface BookmarkDescriptor {
  id: string;
  name: string;
}

export interface EssentialsBookmarkCapability {
  /** Bookmark the current selection with an optional name. */
  insert: (name?: string) => void;
  /** Remove a bookmark by editor-local id. */
  remove: (id: string) => void;
  /** Authorable bookmarks, for cross-reference/target pickers. */
  list: () => BookmarkDescriptor[];
}

export interface EssentialsFieldsCapability {
  /** Insert a DATE field at the active caret with the current date. */
  insertDate: () => void;
  /** Insert the current date as plain text (WordCraft `insert.dateTime`, update:false). */
  insertDateTime: (dateFormat?: string) => void;
  /**
   * Insert a cross-reference (REF / PAGEREF) to the named bookmark at the
   * caret. A no-op when the target bookmark is unknown.
   */
  insertCrossReference: (options: {
    type: CrossReferenceType;
    bookmark: string;
  }) => void;
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
  "firstRow" | "lastRow" | "firstCol" | "lastCol" | "bandedRows" | "bandedCols";

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
  canSetAutoFit: () => boolean;
  setAutoFit: (mode: "contents" | "window" | "fixed") => void;
  /** Equalize the widths of every column in the selected table. */
  distributeColumns: () => void;
  /** Equalize the heights of every row in the selected table. */
  distributeRows: () => void;
  canMerge: () => boolean;
  canSplit: () => boolean;
  canEditColumn: () => boolean;
  canEditRow: () => boolean;
  /** True when the caret sits inside a table that can be converted to text. */
  canConvertToText: () => boolean;
  /** Word's Convert Table to Text: flatten the active table into body paragraphs. */
  convertToText: () => void;
  /** True when the caret can be turned into a table (outside a table, editable). */
  canConvertToTable: () => boolean;
  /** Word's Convert Text to Table: tab-separated text into a table at the caret. */
  convertToTable: () => void;
  /** True when the active table can be split at the caret row. */
  canSplitTableAtRow: () => boolean;
  /** Word's Split Table: split the active table into two at the caret row. */
  splitTableAtRow: () => void;
  /** True when the active table's body rows can be reordered. */
  canSortTable: () => boolean;
  /** Word's Sort: reorder the table's body rows by the caret column. */
  sortTable: (direction: "ascending" | "descending") => void;
  /** True when the caret sits inside a table that can be deleted. */
  canDeleteTable: () => boolean;
  /** Word's Delete Table: remove the active table. */
  deleteTable: () => void;
  /** True when the caret sits inside a table whose header row can be repeated. */
  canToggleRepeatHeaderRows: () => boolean;
  /** True when the active table repeats its first row as a header. */
  isRepeatHeaderRowsActive: () => boolean;
  /** Word's Repeat Header Rows: toggle the active table's repeating header row. */
  toggleRepeatHeaderRows: () => void;
  merge: () => void;
  split: () => void;
  insertColumnBefore: () => void;
  insertColumnAfter: () => void;
  deleteColumn: () => void;
  insertRowBefore: () => void;
  insertRowAfter: () => void;
  deleteRow: () => void;
  canDeleteCell: () => boolean;
  deleteCell: () => void;
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
  setCellVerticalAlign: (value: "top" | "middle" | "bottom") => void;
  setCellTextDirection: (
    value: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV",
  ) => void;
  setCellWidth: (width: string) => void;
  /** True when the caret sits inside a table row whose height can be changed. */
  canSetActiveTableRowHeight: () => boolean;
  /** Word's row height (Cell Size): set the height of the active row. */
  setActiveTableRowHeight: (height: TableRowHeight) => void;
  /** True when the caret sits inside a table whose cells can be re-margined. */
  canSetCellMargins: () => boolean;
  /** Word's Cell Margins: set per-edge padding on the selected cells. */
  setCellMargins: (margins: TableCellMargins) => void;
  /** True when the caret sits inside a table whose cell spacing can be set. */
  canSetCellSpacing: () => boolean;
  /** Word's Cell Spacing: set the gap between adjacent cells on the active table. */
  setCellSpacing: (value: number | null) => void;
  /** True when the caret sits inside a table whose indent can be set. */
  canSetTableIndent: () => boolean;
  /** Word's Indent from Left: set the horizontal offset of the active table. */
  setTableIndent: (value: number | null) => void;
  /** True when the caret sits inside a table whose alignment can be set. */
  canSetTableAlignment: () => boolean;
  /** Word's table Alignment: set the left/center/right position of the active table. */
  setTableAlignment: (alignment: "left" | "center" | "right" | null) => void;
  /** True when the caret sits inside a table cell that can hold a formula result. */
  canEvaluateTableFormula: () => boolean;
  /** Word's Formula: evaluate a supported aggregate over a direction and
   * write the formatted result into the active cell. */
  evaluateTableFormula: (formula: string) => void;
  /** True when the caret sits inside a table that can be selected. */
  canSelectTable: () => boolean;
  /** Word's Select: expand the caret selection to a cell/row/column/table. */
  selectTablePart: (kind: "cell" | "row" | "column" | "table") => void;
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
  headerFooter: EssentialsHeaderFooterCapability;
  table: EssentialsTableCapability;
  design: EssentialsDesignCapability;
  bookmark: EssentialsBookmarkCapability;
  fields: EssentialsFieldsCapability;
}

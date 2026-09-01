/**
 * Barrel file for the refactored `src/core/model/` module.
 *
 * The public surface (types, functions, constants) is byte-for-byte
 * equivalent to the original `src/core/model.ts`, so all `import`
 * statements that pointed there continue to work via the barrel
 * re-export in `src/core/model.ts`.
 */

// ---- Types (data) ----
export type {
  EditorUnderlineStyle,
  EditorLigatures,
  EditorNumberSpacing,
  EditorNumberForm,
  EditorTextLanguage,
  EditorBorderStyle,
  EditorEmphasisMark,
  EditorTabStop,
  EditorParagraphListStyle,
  EditorImageCrop,
  EditorImageCropShape,
  EditorImageCropFit,
  EditorImageFillMode,
  EditorLineDash,
  EditorImageBorder,
  EditorImageFloatingPosition,
  EditorImageFloatingLayout,
  EditorImageRunData,
  EditorWrapPolygonPoint,
  EditorFieldData,
  EditorFieldChar,
  EditorFootnoteReferenceData,
  EditorEndnoteReferenceData,
  EditorRevision,
  EditorRevisionMetadata,
  EditorNumberingRevision,
  EditorStructuralRevision,
  EditorPropertyRevision,
  EditorAsset,
  EditorFootnoteNumberFormat,
  EditorFootnoteRestart,
  EditorDocxWidthValue,
  EditorTableLayout,
  EditorTableRowHeightRule,
  EditorGradientStop,
  EditorTextFill,
  EditorTextOutline,
  EditorTextShadow,
  EditorGlow,
  EditorReflection,
} from "./types/primitives.js";

export type {
  EditorTextStyle,
  EditorParagraphStyle,
  EditorTableStyle,
  EditorTableFloatingLayout,
  EditorTableConditionalFormat,
  EditorConditionalRowStyle,
  EditorTableConditionalType,
  EditorTableConditionalFlags,
  EditorTableCellStyle,
  EditorNamedStyle,
} from "./types/styles.js";

export type {
  EditorRunBase,
  EditorTextRun,
  EditorTextBoxShape,
  EditorTextBoxBody,
  EditorTextBoxData,
  EditorDropCap,
  EditorSdtBlockWrapper,
  EditorSdtPr,
  EditorSdtSubtype,
  EditorSdtListItem,
  EditorSdtDataBinding,
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableRowStyle,
  EditorTableRowNode,
  EditorTableNode,
  EditorBlockNode,
} from "./types/nodes.js";
export type {
  EditorMathNode,
  EditorMathText,
  EditorMathFraction,
  EditorMathRadical,
  EditorMathScript,
  EditorMathDelimiter,
  EditorMathAccent,
  EditorMathNary,
  EditorMathLimit,
  EditorMathMatrix,
  EditorMathBox,
  EditorMathGroup,
  EditorMathRaw,
  EditorMathStyle,
  EditorMathExpression,
} from "./types/math.js";
export {
  EMPTY_EDITOR_MATH_EXPRESSION,
  MATH_OBJECT_REPLACEMENT,
} from "./types/math.js";

export type { RunKind, RunOfKind, RunVisitor } from "./runKind.js";
export {
  getRunKind,
  isInlineObjectRun,
  visitRun,
  getRunImage,
  getRunTextBox,
  getRunField,
  getRunFieldChar,
  getRunFieldInstruction,
  getRunFootnoteReference,
  getRunEndnoteReference,
  getRunSym,
  getRunMath,
} from "./runKind.js";

export type { EditorFootnote } from "./types/documentFootnotes.js";
export type { EditorEndnote } from "./types/documentEndnotes.js";
export type {
  EditorBookmark,
  EditorBookmarkAnchor,
  EditorBookmarks,
} from "./types/documentBookmarks.js";
export type {
  EditorComment,
  EditorCommentAnchor,
  EditorComments,
} from "./types/documentComments.js";
export type {
  EditorOpcPartKind,
  EditorOpcPartEncoding,
  EditorOpcRelationship,
  EditorOpcContentTypes,
  EditorOpcPart,
  EditorDocxDiagnostic,
  EditorDocxSourcePackage,
} from "./types/docxSourcePackage.js";

export type {
  EditorPageMargins,
  EditorPageSettings,
  EditorColumnsSettings,
  EditorSection,
  EditorSectionBreakType,
  EditorSectionPropertiesSnapshot,
  EditorPageNumbering,
  EditorSectionVerticalAlign,
  EditorFontInfo,
  EditorFootnoteSettings,
  EditorFootnotes,
  EditorEndnoteSettings,
  EditorEndnotes,
  EditorDocumentDesign,
  EditorThemeData,
  EditorWatermark,
  EditorPageBorder,
  EditorDocument,
} from "./types/document.js";

export type {
  EditorPosition,
  EditorSelection,
  EditorEditingZone,
} from "./types/selection.js";

export type {
  EditorCaretSlot,
  EditorLayoutFragmentChar,
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorLayoutParagraph,
  EditorLayoutBlock,
  TableCellBlockPosition,
  EditorLayoutPage,
  EditorLayoutDocument,
} from "./types/layout.js";

export type { EditorState } from "./editorState.js";

// ---- Constants ----
export { EDITOR_ASSET_REF_PREFIX } from "./types/primitives.js";
export {
  DEFAULT_TEXT_STYLE,
  DEFAULT_PARAGRAPH_STYLE,
  EFFECTIVE_TEXT_STYLE_DEFAULTS,
  EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS,
} from "./styleDefaults.js";
export { DEFAULT_EDITOR_PAGE_SETTINGS } from "./pageGeometry.js";

// ---- Paragraph-local queries ----
export {
  getParagraphText,
  getParagraphLength,
  getRunIndex,
  getRunStartOffset,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "./queries.js";

// ---- Style resolution (DIP via createObjectMerger<T>) ----
export {
  textStyleMerger,
  paragraphStyleMerger,
  mergeTextStyles,
  mergeParagraphStyles,
  resolveDefaultParagraphStyleId,
  resolveNamedTextStyle,
  resolveNamedParagraphStyle,
  resolveEffectiveTextStyle,
  resolveEffectiveTextStyleForParagraph,
  resolveEffectiveParagraphStyle,
} from "./styleResolution.js";
export type { StyleMerger, Mergeable } from "./styleResolution.js";

// ---- Assets ----
export { resolveImageSrc } from "./assets.js";

// ---- Page geometry ----
export {
  normalizePageSettings,
  getDocumentPageSettings,
  getPageContentWidth,
  getPageColumnRects,
  getPageHeaderZoneTop,
  getPageBodyTop,
  getPageFooterReferenceTop,
  getPageBodyBottom,
  getPageHeaderZoneHeight,
  getPageFooterZoneTop,
  getPageFooterZoneHeight,
  getPageContentHeight,
} from "./pageGeometry.js";

// ---- Document sections ----
export {
  getDocumentSections,
  getDocumentSectionsCanonical,
} from "./documentSections.js";

// ---- Document paragraph index (OCP via DocumentIndexBuilder) ----
export {
  DocumentIndexBuilder,
  getDocumentParagraphIndex,
  getDocumentParagraphs,
  getDocumentParagraphsCanonical,
  getParagraphById,
  findParagraphLocation,
  findParagraphTableLocation,
  findParagraphTablePathLocation,
  resolveTablePath,
  WeakMapDocumentIndexCache,
} from "./documentIndex.js";
export type {
  EditorParagraphLocation,
  TableLocation,
  TablePathSegment,
  DocumentParagraphIndexEntry,
  DocumentIndexCache,
} from "./documentIndex.js";

// ---- Paragraph walker ----
export {
  getBlockParagraphs,
  collectSectionParagraphs,
} from "./paragraphWalker.js";

// ---- List numbering ----
export { buildListLabels, resolveListLabel } from "./listNumbering.js";

// ---- Editing zones (LSP via tryGet* variant) ----
export {
  getActiveSectionIndex,
  getActiveZone,
  getEditableBlocksForZone,
  tryGetEditableBlocksForZone,
  getActiveSectionBlocks,
  getParagraphs,
} from "./editingZones.js";

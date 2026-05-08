import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphStyle,
  EditorParagraphNode,
  EditorTableNode,
  EditorTextStyle,
  EditorTextRun,
} from "../../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
  resolveImageSrc,
} from "../../core/model.js";
import { DEFAULT_EDITOR_STYLES } from "../../core/editorState.js";

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> | undefined {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

function normalizeParagraphStyle(style: EditorParagraphStyle | undefined) {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveParagraphStyle(style, DEFAULT_EDITOR_STYLES);
  const defaultEffective = resolveEffectiveParagraphStyle(undefined, DEFAULT_EDITOR_STYLES);

  return stripUndefined({
    align: effective.align !== defaultEffective.align ? effective.align : undefined,
    spacingBefore:
      effective.spacingBefore !== defaultEffective.spacingBefore ? effective.spacingBefore : undefined,
    spacingAfter:
      effective.spacingAfter !== defaultEffective.spacingAfter ? effective.spacingAfter : undefined,
    lineHeight: effective.lineHeight !== defaultEffective.lineHeight ? effective.lineHeight : undefined,
    indentLeft: effective.indentLeft !== defaultEffective.indentLeft ? effective.indentLeft : undefined,
    indentRight: effective.indentRight !== defaultEffective.indentRight ? effective.indentRight : undefined,
    indentFirstLine:
      effective.indentFirstLine !== defaultEffective.indentFirstLine ? effective.indentFirstLine : undefined,
    indentHanging:
      effective.indentHanging !== defaultEffective.indentHanging ? effective.indentHanging : undefined,
    shading: effective.shading !== defaultEffective.shading ? effective.shading : undefined,
    pageBreakBefore:
      effective.pageBreakBefore !== defaultEffective.pageBreakBefore ? effective.pageBreakBefore : undefined,
    keepWithNext: effective.keepWithNext !== defaultEffective.keepWithNext ? effective.keepWithNext : undefined,
  });
}

function normalizeRunStyle(style: EditorTextStyle | undefined, paragraphStyleId: string | undefined) {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveTextStyleForParagraph(style, paragraphStyleId, DEFAULT_EDITOR_STYLES);
  const defaultEffective = resolveEffectiveTextStyleForParagraph(undefined, paragraphStyleId, DEFAULT_EDITOR_STYLES);

  return stripUndefined({
    bold: effective.bold !== defaultEffective.bold ? effective.bold : undefined,
    italic: effective.italic !== defaultEffective.italic ? effective.italic : undefined,
    underline: effective.underline !== defaultEffective.underline ? effective.underline : undefined,
    strike: effective.strike !== defaultEffective.strike ? effective.strike : undefined,
    superscript: effective.superscript !== defaultEffective.superscript ? effective.superscript : undefined,
    subscript: effective.subscript !== defaultEffective.subscript ? effective.subscript : undefined,
    fontFamily: effective.fontFamily !== defaultEffective.fontFamily ? effective.fontFamily : undefined,
    fontSize: effective.fontSize !== defaultEffective.fontSize ? effective.fontSize : undefined,
    color: effective.color !== defaultEffective.color ? effective.color : undefined,
    highlight: effective.highlight !== defaultEffective.highlight ? effective.highlight : undefined,
    link: effective.link !== defaultEffective.link ? effective.link : undefined,
  });
}

function normalizeRun(
  run: EditorTextRun,
  paragraphStyleId: string | undefined,
  document: Pick<EditorDocument, "assets"> | undefined,
) {
  return {
    text: run.text,
    styles: normalizeRunStyle(run.styles, paragraphStyleId),
    // Resolve any "asset:<id>" reference back to the materialized URL so
    // round-trip comparisons against the original (inline-data-URL) spec
    // still match after the importer dedupes images into `document.assets`.
    image: run.image
      ? { ...run.image, src: resolveImageSrc(document, run.image.src) }
      : undefined,
  };
}

function normalizeParagraph(
  paragraph: EditorParagraphNode,
  document: Pick<EditorDocument, "assets"> | undefined,
) {
  return {
    type: paragraph.type,
    runs: paragraph.runs.map((run) => normalizeRun(run, paragraph.style?.styleId, document)),
    style: normalizeParagraphStyle(paragraph.style),
    list: paragraph.list ?? undefined,
  };
}

function normalizeTable(
  table: EditorTableNode,
  document: Pick<EditorDocument, "assets"> | undefined,
) {
  return {
    type: table.type,
    rows: table.rows.map((row) => ({
      isHeader: row.isHeader ?? undefined,
      cells: row.cells.map((cell) => ({
        colSpan: cell.colSpan ?? undefined,
        rowSpan: cell.rowSpan ?? undefined,
        vMerge: cell.vMerge ?? undefined,
        blocks: cell.blocks.map((paragraph) => normalizeParagraph(paragraph, document)),
      })),
    })),
  };
}

function normalizeBlock(
  block: EditorBlockNode,
  document: Pick<EditorDocument, "assets"> | undefined,
) {
  return block.type === "paragraph"
    ? normalizeParagraph(block, document)
    : normalizeTable(block, document);
}

export function normalizeEditorDocument(document: EditorDocument) {
  return {
    pageSettings: document.pageSettings
        ? {
            width: document.pageSettings.width,
            height: document.pageSettings.height,
            orientation: document.pageSettings.orientation,
            margins: { ...document.pageSettings.margins },
          }
        : undefined,
    blocks: document.blocks.map((block) => normalizeBlock(block, document)),
  };
}

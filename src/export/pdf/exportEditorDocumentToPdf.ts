import type { EditorDocument } from "@/core/model.js";
import { renumberImageCaptionsInDocument } from "@/core/document/imageCaptions.js";
import {
  resolveEffectiveTextStyleForParagraph,
  getPageBodyTop,
  getPageContentWidth,
  getPageColumnRects,
  getPageHeaderZoneTop,
} from "@/core/model.js";
import { findFootnoteReference } from "@/core/footnotes.js";
import { outlineFrom } from "@/core/headings.js";
import {
  FOOTNOTE_MARKER_GUTTER_PX,
  projectDocumentLayout,
} from "@/layoutProjection/index.js";
import { drawBlockList } from "./draw/drawBlockList.js";
import { drawPageBackground } from "./draw/drawPageBackground.js";
import { getListOrdinals } from "./draw/lists.js";
import { collectPdfFontFamilies } from "./fonts/collectPdfFontFamilies.js";
import { PdfFontRegistry } from "./fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "./OasisPdfWriter.js";
import { pxToPt, textStyleToFontSizePt } from "./units.js";

const FOOTNOTE_BLOCK_GAP_PX = 2;

const PDF_PRODUCER = "Oasis Editor";

/**
 * Resolves the PDF `/Info` dictionary from the document's metadata. Title comes
 * from `metadata.title`; author/subject/keywords are read from the open-ended
 * metadata map when present as strings. Producer and creation date are always set.
 */
function resolveDocumentInfo(document: EditorDocument) {
  const metadata = document.metadata ?? {};
  const asString = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() !== "" ? value : undefined;
  return {
    title: asString(metadata.title),
    author: asString(metadata.author),
    subject: asString(metadata.subject),
    keywords: asString(metadata.keywords),
    producer: PDF_PRODUCER,
    creationDate: new Date(),
  };
}

/**
 * Maps each paragraph id to the bookmark names whose start anchor lives in it, so
 * the draw pass can register a named PDF destination at the paragraph's position
 * (the jump target for internal `#anchor` links).
 */
function collectBookmarkNamesByParagraph(
  document: EditorDocument,
): Map<string, string[]> {
  const byParagraph = new Map<string, string[]>();
  const bookmarks = document.bookmarks;
  if (!bookmarks) {
    return byParagraph;
  }
  for (const id of bookmarks.order) {
    const bookmark = bookmarks.items[id];
    const paragraphId = bookmark?.start?.paragraphId;
    if (!bookmark || !paragraphId) {
      continue;
    }
    const names = byParagraph.get(paragraphId) ?? [];
    names.push(bookmark.name);
    byParagraph.set(paragraphId, names);
  }
  return byParagraph;
}

/** Named-destination prefix for heading outline targets (avoids bookmark clashes). */
const HEADING_DEST_PREFIX = "__oasis_heading_";

/**
 * Builds the `onParagraphDrawn` hook for a body block list. When a paragraph is
 * drawn it (1) registers a named destination for each bookmark start it owns so
 * internal `#anchor` links can jump to it, and (2) for heading paragraphs,
 * registers an outline destination and appends a document-ordered outline item.
 * Returns `undefined` when there is nothing to track (skips the per-paragraph
 * work entirely).
 */
function registerBookmarkDestinations(
  writer: OasisPdfWriter,
  pageIndex: number,
  originX: number,
  bookmarkNamesByParagraph: Map<string, string[]>,
  headingByParagraph: Map<string, { level: number; title: string }>,
): ((paragraphId: string, topPx: number) => void) | undefined {
  if (bookmarkNamesByParagraph.size === 0 && headingByParagraph.size === 0) {
    return undefined;
  }
  return (paragraphId, topPx) => {
    const y = pxToPt(topPx);
    const x = pxToPt(originX);
    for (const name of bookmarkNamesByParagraph.get(paragraphId) ?? []) {
      writer.addNamedDestination({ name, pageIndex, x, y });
    }
    const heading = headingByParagraph.get(paragraphId);
    if (heading) {
      const destName = `${HEADING_DEST_PREFIX}${paragraphId}`;
      writer.addNamedDestination({ name: destName, pageIndex, x, y });
      writer.addOutlineItem({
        title: heading.title,
        level: heading.level,
        destName,
      });
    }
  };
}

export async function exportEditorDocumentToPdf(
  document: EditorDocument,
): Promise<ArrayBuffer> {
  document = renumberImageCaptionsInDocument(document);
  const fontRegistry = new PdfFontRegistry();
  await fontRegistry.loadBundledUnicodeFaces({
    families: collectPdfFontFamilies(document),
  });
  const writer = new OasisPdfWriter(fontRegistry.getPdfFontResources());
  writer.setDocumentInfo(resolveDocumentInfo(document));
  const layout = projectDocumentLayout(document);
  const listOrdinals = getListOrdinals(document);
  const bookmarkNamesByParagraph = collectBookmarkNamesByParagraph(document);
  const headingByParagraph = new Map(
    outlineFrom(document).map((item) => [
      item.id,
      { level: item.level, title: item.text },
    ]),
  );

  for (const page of layout.pages) {
    const width = Math.max(1, pxToPt(page.pageSettings.width));
    const height = Math.max(1, pxToPt(page.pageSettings.height));
    const pageIndex = writer.addPage({ width, height });
    drawPageBackground(writer, pageIndex, width, height);

    const originX =
      page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const contentWidth = getPageContentWidth(page.pageSettings);
    await drawBlockList(
      writer,
      pageIndex,
      page.headerBlocks,
      document,
      originX,
      page.headerTop ?? getPageHeaderZoneTop(page.pageSettings),
      contentWidth,
      fontRegistry,
      listOrdinals,
      page.pageSettings,
    );
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const hasColumns = page.blocks.some(
      (block) => block.columnIndex !== undefined,
    );
    if (hasColumns) {
      const columnRects = getPageColumnRects(page.pageSettings);
      const byColumn = new Map<number, typeof page.blocks>();
      for (const block of page.blocks) {
        const column = block.columnIndex ?? 0;
        const bucket = byColumn.get(column) ?? [];
        bucket.push(block);
        byColumn.set(column, bucket);
      }
      for (const [column, columnBlocks] of byColumn) {
        const rect = columnRects[column] ?? columnRects[0]!;
        await drawBlockList(
          writer,
          pageIndex,
          columnBlocks,
          document,
          rect.left,
          bodyTop,
          rect.width,
          fontRegistry,
          listOrdinals,
          page.pageSettings,
          registerBookmarkDestinations(
            writer,
            pageIndex,
            rect.left,
            bookmarkNamesByParagraph,
            headingByParagraph,
          ),
        );
      }
    } else {
      await drawBlockList(
        writer,
        pageIndex,
        page.blocks,
        document,
        originX,
        bodyTop,
        contentWidth,
        fontRegistry,
        listOrdinals,
        page.pageSettings,
        registerBookmarkDestinations(
          writer,
          pageIndex,
          originX,
          bookmarkNamesByParagraph,
          headingByParagraph,
        ),
      );
    }
    await drawBlockList(
      writer,
      pageIndex,
      page.footerBlocks,
      document,
      originX,
      page.footerTop ?? page.bodyBottom ?? page.pageSettings.height,
      contentWidth,
      fontRegistry,
      listOrdinals,
      page.pageSettings,
    );
    if (
      page.footnoteBlocks &&
      page.footnoteBlocks.length > 0 &&
      page.footnoteTop !== undefined
    ) {
      if (page.footnoteSeparatorTop !== undefined) {
        writer.drawLine(pageIndex, {
          x1: pxToPt(originX),
          y1: pxToPt(page.footnoteSeparatorTop + 0.5),
          x2: pxToPt(originX + Math.min(180, contentWidth * 0.35)),
          y2: pxToPt(page.footnoteSeparatorTop + 0.5),
          stroke: "#64748b",
          lineWidth: pxToPt(1),
        });
      }
      await drawFootnoteBlockList(
        writer,
        pageIndex,
        page.footnoteBlocks,
        page.footnoteReferenceIds ?? [],
        document,
        originX,
        page.footnoteTop,
        contentWidth,
        fontRegistry,
        listOrdinals,
      );
    }
  }

  if (writer.getPageCount() === 0) {
    const pageIndex = writer.addPage({ width: 612, height: 792 });
    drawPageBackground(writer, pageIndex, 612, 792);
  }

  return writer.toArrayBuffer();
}

export async function exportEditorDocumentToPdfBlob(
  document: EditorDocument,
): Promise<Blob> {
  const buffer = await exportEditorDocumentToPdf(document);
  return new Blob([buffer], { type: "application/pdf" });
}

async function drawFootnoteBlockList(
  writer: OasisPdfWriter,
  pageIndex: number,
  blocks: NonNullable<
    ReturnType<typeof projectDocumentLayout>["pages"][number]["footnoteBlocks"]
  >,
  footnoteReferenceIds: string[],
  document: EditorDocument,
  originX: number,
  originY: number,
  contentWidth: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, string>,
): Promise<void> {
  let cursorY = originY;
  const markerDrawn = new Set<string>();
  const markerByFootnoteId = new Map(
    footnoteReferenceIds.map((footnoteId) => [
      footnoteId,
      findFootnoteReference(document, footnoteId)?.run.text ?? "",
    ]),
  );

  for (const block of blocks) {
    const owningFootnoteId = footnoteReferenceIds.find((footnoteId) =>
      block.blockId.startsWith(`${footnoteId}:`),
    );
    if (owningFootnoteId && !markerDrawn.has(owningFootnoteId)) {
      const marker = markerByFootnoteId.get(owningFootnoteId);
      if (marker) {
        const firstParagraph =
          block.sourceBlock.type === "paragraph"
            ? block.sourceBlock
            : undefined;
        const styles = resolveEffectiveTextStyleForParagraph(
          undefined,
          firstParagraph?.style?.styleId,
          document.styles,
        );
        const fontFace = fontRegistry.resolveFontFace({
          fontFamily: styles.fontFamily,
          bold: styles.bold,
          italic: styles.italic,
        });
        writer.drawText(pageIndex, {
          x: pxToPt(originX),
          y: pxToPt(cursorY + 12),
          text: marker,
          fontSize: textStyleToFontSizePt(styles),
          color: styles.color ?? "#000000",
          bold: styles.bold,
          italic: styles.italic,
          fontResourceName: fontFace.writerResourceName,
        });
      }
      markerDrawn.add(owningFootnoteId);
    }

    await drawBlockList(
      writer,
      pageIndex,
      [block],
      document,
      originX + FOOTNOTE_MARKER_GUTTER_PX,
      cursorY,
      Math.max(24, contentWidth - FOOTNOTE_MARKER_GUTTER_PX),
      fontRegistry,
      listOrdinals,
    );
    cursorY += Math.max(0, block.estimatedHeight) + FOOTNOTE_BLOCK_GAP_PX;
  }
}

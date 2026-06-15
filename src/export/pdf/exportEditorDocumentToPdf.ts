import type { EditorDocument } from "../../core/model.js";
import {
  resolveEffectiveTextStyleForParagraph,
  getPageBodyTop,
  getPageContentWidth,
  getPageHeaderZoneTop,
} from "../../core/model.js";
import { findFootnoteReference } from "../../core/footnotes.js";
import {
  FOOTNOTE_MARKER_GUTTER_PX,
  projectDocumentLayout,
} from "../../layoutProjection/index.js";
import { drawBlockList } from "./draw/drawBlockList.js";
import { drawPageBackground } from "./draw/drawPageBackground.js";
import { getListOrdinals } from "./draw/lists.js";
import { collectPdfFontFamilies } from "./fonts/collectPdfFontFamilies.js";
import { PdfFontRegistry } from "./fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "./OasisPdfWriter.js";
import { pxToPt, textStyleToFontSizePt } from "./units.js";

const FOOTNOTE_BLOCK_GAP_PX = 2;

export async function exportEditorDocumentToPdf(
  document: EditorDocument,
): Promise<ArrayBuffer> {
  const fontRegistry = new PdfFontRegistry();
  await fontRegistry.loadBundledUnicodeFaces({
    families: collectPdfFontFamilies(document),
  });
  const writer = new OasisPdfWriter(fontRegistry.getPdfFontResources());
  const layout = projectDocumentLayout(document);
  const listOrdinals = getListOrdinals(document);

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
    await drawBlockList(
      writer,
      pageIndex,
      page.blocks,
      document,
      originX,
      page.bodyTop ?? getPageBodyTop(page.pageSettings),
      contentWidth,
      fontRegistry,
      listOrdinals,
      page.pageSettings,
    );
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
  listOrdinals: Map<string, number>,
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

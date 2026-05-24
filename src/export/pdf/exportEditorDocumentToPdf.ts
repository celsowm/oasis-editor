import type { EditorDocument } from "../../core/model.js";
import {
  getPageBodyTop,
  getPageContentWidth,
  getPageHeaderZoneTop,
} from "../../core/model.js";
import { projectDocumentLayout } from "../../ui/layoutProjection.js";
import { drawBlockList } from "./draw/drawBlockList.js";
import { drawPageBackground } from "./draw/drawPageBackground.js";
import { getListOrdinals } from "./draw/lists.js";
import { collectPdfFontFamilies } from "./fonts/collectPdfFontFamilies.js";
import { PdfFontRegistry } from "./fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "./OasisPdfWriter.js";
import { pxToPt } from "./units.js";

export async function exportEditorDocumentToPdf(document: EditorDocument): Promise<ArrayBuffer> {
  const fontRegistry = new PdfFontRegistry();
  await fontRegistry.loadBundledUnicodeFaces({ families: collectPdfFontFamilies(document) });
  const writer = new OasisPdfWriter(fontRegistry.getPdfFontResources());
  const layout = projectDocumentLayout(document, undefined, undefined, undefined, { layoutMode: "wordParity" });
  const listOrdinals = getListOrdinals(document);

  for (const page of layout.pages) {
    const width = Math.max(1, pxToPt(page.pageSettings.width));
    const height = Math.max(1, pxToPt(page.pageSettings.height));
    const pageIndex = writer.addPage({ width, height });
    drawPageBackground(writer, pageIndex, width, height);

    const originX = page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const contentWidth = getPageContentWidth(page.pageSettings);
    drawBlockList(
      writer,
      pageIndex,
      page.headerBlocks,
      document,
      originX,
      page.headerTop ?? getPageHeaderZoneTop(page.pageSettings),
      contentWidth,
      fontRegistry,
      listOrdinals,
    );
    drawBlockList(
      writer,
      pageIndex,
      page.blocks,
      document,
      originX,
      page.bodyTop ?? getPageBodyTop(page.pageSettings),
      contentWidth,
      fontRegistry,
      listOrdinals,
    );
    drawBlockList(
      writer,
      pageIndex,
      page.footerBlocks,
      document,
      originX,
      page.footerTop ?? page.bodyBottom ?? page.pageSettings.height,
      contentWidth,
      fontRegistry,
      listOrdinals,
    );
  }

  if (writer.getPageCount() === 0) {
    const pageIndex = writer.addPage({ width: 612, height: 792 });
    drawPageBackground(writer, pageIndex, 612, 792);
  }

  return writer.toArrayBuffer();
}

export async function exportEditorDocumentToPdfBlob(document: EditorDocument): Promise<Blob> {
  const buffer = await exportEditorDocumentToPdf(document);
  return new Blob([buffer], { type: "application/pdf" });
}

/**
 * Facade over the PDF writer collaborators. Keeps the original public surface
 * (`drawRect`/`drawText`/`drawImage`/…, `toArrayBuffer`/`toBlob`, the option and
 * resource types) so existing callers are untouched, while delegating to:
 *  - {@link PdfContentStream} — per-page content operators,
 *  - {@link PdfFontTable} — font resources + embedded Unicode fonts,
 *  - {@link PdfImageTable} — image XObjects,
 *  - {@link serializePdfDocument} — the final byte assembly.
 */
import type {
  OasisPdfFontResource,
  OasisPdfImageOptions,
  OasisPdfImageResource,
  OasisPdfLineOptions,
  OasisPdfPage,
  OasisPdfPageSize,
  OasisPdfPathOptions,
  OasisPdfRectOptions,
  OasisPdfTextOptions,
} from "./writer/pdfTypes.js";
import { DEFAULT_PDF_FONT_RESOURCES } from "./writer/pdfPrimitives.js";
import { PdfContentStream } from "./writer/PdfContentStream.js";
import { PdfFontTable } from "./writer/PdfFontTable.js";
import { PdfImageTable } from "./writer/PdfImageTable.js";
import { serializePdfDocument } from "./writer/PdfDocumentSerializer.js";

export type {
  OasisPdfPageSize,
  OasisPdfPage,
  OasisPdfRectOptions,
  OasisPdfLineOptions,
  OasisPdfPathSegment,
  OasisPdfPathOptions,
  OasisPdfTextOptions,
  OasisPdfImageResource,
  OasisPdfImageOptions,
  OasisPdfFontResource,
  OasisPdfBase14FontResource,
  OasisPdfUnicodeFontResource,
} from "./writer/pdfTypes.js";

export class OasisPdfWriter {
  private readonly pages: OasisPdfPage[] = [];
  private readonly streams: PdfContentStream[] = [];
  private readonly fonts: PdfFontTable;
  private readonly images = new PdfImageTable();

  constructor(
    fontResources: OasisPdfFontResource[] = DEFAULT_PDF_FONT_RESOURCES,
  ) {
    this.fonts = new PdfFontTable(fontResources);
  }

  registerFontResource(resource: OasisPdfFontResource): void {
    this.fonts.registerFontResource(resource);
  }

  addPage(size: OasisPdfPageSize): number {
    const page: OasisPdfPage = {
      width: Math.max(1, size.width),
      height: Math.max(1, size.height),
      commands: [],
      imageResourceNames: new Set(),
    };
    this.pages.push(page);
    this.streams.push(new PdfContentStream(page, this.fonts, this.images));
    return this.pages.length - 1;
  }

  getPageCount(): number {
    return this.pages.length;
  }

  drawRect(pageIndex: number, options: OasisPdfRectOptions): void {
    this.streams[pageIndex]?.drawRect(options);
  }

  drawLine(pageIndex: number, options: OasisPdfLineOptions): void {
    this.streams[pageIndex]?.drawLine(options);
  }

  drawPath(pageIndex: number, options: OasisPdfPathOptions): void {
    this.streams[pageIndex]?.drawPath(options);
  }

  saveGraphicsState(pageIndex: number): void {
    this.streams[pageIndex]?.saveGraphicsState();
  }

  restoreGraphicsState(pageIndex: number): void {
    this.streams[pageIndex]?.restoreGraphicsState();
  }

  rotateAbout(
    pageIndex: number,
    centerX: number,
    centerY: number,
    degrees: number,
  ): void {
    this.streams[pageIndex]?.rotateAbout(centerX, centerY, degrees);
  }

  clipRect(
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.streams[pageIndex]?.clipRect(x, y, width, height);
  }

  drawText(pageIndex: number, options: OasisPdfTextOptions): void {
    this.streams[pageIndex]?.drawText(options);
  }

  registerImageResource(
    resource: Omit<OasisPdfImageResource, "resourceName"> & {
      resourceName?: string;
    },
  ): string {
    return this.images.registerImageResource(resource);
  }

  drawImage(pageIndex: number, options: OasisPdfImageOptions): void {
    this.streams[pageIndex]?.drawImage(options);
  }

  toArrayBuffer(): ArrayBuffer {
    const bytes = this.toUint8Array();
    return Uint8Array.from(bytes).buffer;
  }

  toBlob(): Blob {
    return new Blob([this.toArrayBuffer()], { type: "application/pdf" });
  }

  private toUint8Array(): Uint8Array {
    if (this.pages.length === 0) {
      this.addPage({ width: 612, height: 792 });
    }
    return serializePdfDocument(this.pages, this.fonts, this.images);
  }
}

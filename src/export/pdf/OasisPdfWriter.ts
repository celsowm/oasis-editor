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
  OasisPdfAxialGradient,
  OasisPdfLinkAnnotation,
  OasisPdfNamedDestination,
  OasisPdfOutlineItem,
  OasisPdfDocumentInfo,
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
import { PdfShadingTable } from "./writer/PdfShadingTable.js";
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
  OasisPdfLinkAnnotation,
  OasisPdfAnnotation,
  OasisPdfNamedDestination,
  OasisPdfOutlineItem,
  OasisPdfDocumentInfo,
} from "./writer/pdfTypes.js";

export class OasisPdfWriter {
  private readonly pages: OasisPdfPage[] = [];
  private readonly streams: PdfContentStream[] = [];
  private readonly fonts: PdfFontTable;
  private readonly images = new PdfImageTable();
  private readonly shadings = new PdfShadingTable();
  private readonly namedDestinations: OasisPdfNamedDestination[] = [];
  private readonly outlineItems: OasisPdfOutlineItem[] = [];
  private documentInfo: OasisPdfDocumentInfo | undefined;

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
      shadingResourceNames: new Set(),
      annotations: [],
    };
    this.pages.push(page);
    this.streams.push(
      new PdfContentStream(page, this.fonts, this.images, this.shadings),
    );
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

  /**
   * Registers an axial (linear) gradient on a page for use as a glyph fill, and
   * returns its shading resource name to pass as `gradientShadingName` on a
   * subsequent `drawText`. Coordinates are in the writer's top-left point space.
   */
  registerAxialGradient(
    pageIndex: number,
    gradient: OasisPdfAxialGradient,
  ): string | null {
    return this.streams[pageIndex]?.registerAxialGradient(gradient) ?? null;
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

  /**
   * Attaches a clickable external link annotation to a page. The rect is in the
   * writer's top-left point space; the serializer flips it to PDF space.
   */
  addLinkAnnotation(
    pageIndex: number,
    annotation: OasisPdfLinkAnnotation,
  ): void {
    this.pages[pageIndex]?.annotations.push(annotation);
  }

  /**
   * Registers a named destination (jump target). Position is in the writer's
   * top-left point space. The first registration of a given name wins; later
   * duplicates are ignored so destinations stay unique in the names tree.
   */
  addNamedDestination(destination: OasisPdfNamedDestination): void {
    if (this.namedDestinations.some((d) => d.name === destination.name)) {
      return;
    }
    this.namedDestinations.push(destination);
  }

  /**
   * Appends an outline (bookmarks-panel) entry. Call in document order; the
   * serializer nests entries by `level`.
   */
  addOutlineItem(item: OasisPdfOutlineItem): void {
    this.outlineItems.push(item);
  }

  /** Sets the document information dictionary (`/Info`). */
  setDocumentInfo(info: OasisPdfDocumentInfo): void {
    this.documentInfo = info;
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
    return serializePdfDocument(
      this.pages,
      this.fonts,
      this.images,
      this.shadings,
      this.namedDestinations,
      this.outlineItems,
      this.documentInfo,
    );
  }
}

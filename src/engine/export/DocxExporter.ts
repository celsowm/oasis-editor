import { DocumentExporter } from "../../core/export/DocumentExporter.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { NativeDocxExporter } from "./NativeDocxExporter.js";
import { IFontManager } from "../../core/typography/FontManager.js";

export class DocxExporter implements DocumentExporter {
  private native: NativeDocxExporter;

  constructor(fontManager: IFontManager) {
    this.native = new NativeDocxExporter(fontManager);
  }

  async exportToBlob(document: DocumentModel): Promise<Blob> {
    return this.native.exportToBlob(document);
  }

  async exportToBuffer(document: DocumentModel): Promise<ArrayBuffer> {
    return this.native.exportToBuffer(document);
  }
}

import { DocumentExporter } from "../../core/export/DocumentExporter.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { WmlWriter } from "../opc/writing/WordprocessingMLWriter.js";
import { OPCPackageWriter } from "../opc/OPCPackageWriter.js";
import { IFontManager } from "../../core/typography/FontManager.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";

export class NativeDocxExporter implements DocumentExporter {
  private wmlWriter: WmlWriter;
  private opcWriter: OPCPackageWriter;

  constructor(fontManager: IFontManager) {
    this.wmlWriter = new WmlWriter();
    this.opcWriter = new OPCPackageWriter(fontManager);
  }

  async exportToBlob(document: DocumentModel): Promise<Blob> {
    const buffer = await this.exportToBuffer(document);
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }

  async exportToBuffer(document: DocumentModel, _layout?: LayoutState): Promise<ArrayBuffer> {
    const wmlResult = this.wmlWriter.write(document);
    const uint8 = await this.opcWriter.write(document, wmlResult);
    return uint8.buffer as ArrayBuffer;
  }
}

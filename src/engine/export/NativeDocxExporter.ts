import JSZip from "jszip";
import { DocumentExporter } from "../../core/export/DocumentExporter.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { WMLWriter } from "../opc/WMLWriter.js";
import { OPCPackageWriter } from "../opc/OPCPackageWriter.js";
import { IFontManager } from "../../core/typography/FontManager.js";

export class NativeDocxExporter implements DocumentExporter {
  private wmlWriter: WMLWriter;
  private opcWriter: OPCPackageWriter;

  constructor(fontManager: IFontManager) {
    this.wmlWriter = new WMLWriter();
    this.opcWriter = new OPCPackageWriter(fontManager);
  }

  async exportToBlob(document: DocumentModel): Promise<Blob> {
    const buffer = await this.exportToBuffer(document);
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }

  async exportToBuffer(document: DocumentModel): Promise<ArrayBuffer> {
    const wmlResult = this.wmlWriter.write(document);
    const parts = this.opcWriter.build(
      wmlResult.xml,
      wmlResult.relationships,
      wmlResult.imageParts,
      wmlResult.footnotesXml,
      wmlResult.endnotesXml,
      wmlResult.commentsXml,
      wmlResult.headerXml,
      wmlResult.footerXml,
    );

    const zip = new JSZip();
    for (const part of parts.values()) {
      zip.file(part.name, part.content);
    }

    return zip.generateAsync({ type: "arraybuffer" });
  }
}

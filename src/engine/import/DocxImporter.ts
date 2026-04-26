import { DocumentImporter } from "../../core/import/DocumentImporter.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { NativeDocxImporter } from "./NativeDocxImporter.js";

export class DocxImporter implements DocumentImporter {
  private native = new NativeDocxImporter();

  public async importFromBuffer(arrayBuffer: ArrayBuffer): Promise<DocumentModel> {
    return this.native.importFromBuffer(arrayBuffer);
  }
}

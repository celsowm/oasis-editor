import { DocumentModel } from "../document/DocumentTypes.js";

export interface DocumentImporter {
  importFromBuffer(buffer: ArrayBuffer): Promise<DocumentModel>;
}

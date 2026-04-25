import { DocumentModel } from "../document/DocumentTypes.js";

export interface DocumentExporter {
  exportToBlob(document: DocumentModel): Promise<Blob>;
  exportToBuffer(document: DocumentModel): Promise<ArrayBuffer>;
}

import { DocumentModel } from "../document/DocumentTypes.js";
import { LayoutState } from "../layout/LayoutTypes.js";

export interface DocumentExporter {
  exportToBlob(document: DocumentModel, layout?: LayoutState): Promise<Blob>;
  exportToBuffer(document: DocumentModel, layout?: LayoutState): Promise<ArrayBuffer>;
}

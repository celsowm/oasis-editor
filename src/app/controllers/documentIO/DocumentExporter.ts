import type { EditorDocument } from "../../../core/model.js";
import { exportEditorDocumentToDocxBlob } from "../../../export/docx/exportEditorDocumentToDocx.js";
import { exportEditorDocumentToPdfBlob } from "../../../export/pdf/exportEditorDocumentToPdf.js";
import { downloadBlob } from "./downloadBlob.js";

export interface DocumentExporterDeps {
  document: () => EditorDocument;
  focusInput: () => void;
  download?: (blob: Blob, filename: string) => void;
}

export function createDocumentExporter(deps: DocumentExporterDeps) {
  const download = deps.download ?? downloadBlob;

  const handleExportDocx = async () => {
    const blob = await exportEditorDocumentToDocxBlob(deps.document());
    download(blob, "oasis-editor.docx");
    deps.focusInput();
  };

  const handleExportPdf = async () => {
    const blob = await exportEditorDocumentToPdfBlob(deps.document());
    download(blob, "oasis-editor.pdf");
    deps.focusInput();
  };

  return {
    handleExportDocx,
    handleExportPdf,
  };
}

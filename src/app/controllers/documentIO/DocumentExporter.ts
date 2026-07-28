import type { EditorDocument } from "@/core/model.js";
import { exportEditorDocumentToDocxBlob } from "@/export/docx/exportEditorDocumentToDocx.js";
import { exportEditorDocumentToPdfBlob } from "@/export/pdf/exportEditorDocumentToPdf.js";
import { downloadBlob } from "./downloadBlob.js";

/** Dependencies required by {@link createDocumentExporter}. */
export interface DocumentExporterDeps {
  document: () => EditorDocument;
  focusInput: () => void;
  download?: (blob: Blob, filename: string) => void;
}

/**
 * Creates a document exporter with support for .docx and .pdf output.
 * @param deps - The dependencies required for exporting.
 * @returns An object with export methods.
 */
export function createDocumentExporter(deps: DocumentExporterDeps): {
  handleExportDocx: () => Promise<Blob>;
  handleExportPdf: () => Promise<Blob>;
  exportDocxBlob: () => Promise<Blob>;
  exportPdfBlob: () => Promise<Blob>;
} {
  const download = deps.download ?? downloadBlob;

  const handleExportDocx = async (): Promise<Blob> => {
    const blob = await exportEditorDocumentToDocxBlob(deps.document());
    download(blob, "oasis-editor.docx");
    deps.focusInput();
    return blob;
  };

  const handleExportPdf = async (): Promise<Blob> => {
    const blob = await exportEditorDocumentToPdfBlob(deps.document());
    download(blob, "oasis-editor.pdf");
    deps.focusInput();
    return blob;
  };

  const exportDocxBlob = (): Promise<Blob> => exportEditorDocumentToDocxBlob(deps.document());
  const exportPdfBlob = (): Promise<Blob> => exportEditorDocumentToPdfBlob(deps.document());

  return {
    handleExportDocx,
    handleExportPdf,
    exportDocxBlob,
    exportPdfBlob,
  };
}

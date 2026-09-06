import type { EditorDocument } from "@/core/model.js";
import { exportEditorDocumentToDocxBlobPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { exportEditorDocumentToPdfBlob } from "@/export/pdf/exportEditorDocumentToPdf.js";
import { downloadBlob } from "./downloadBlob.js";
import { printBlob } from "./printBlob.js";

/** Dependencies required by {@link createDocumentExporter}. */
export interface DocumentExporterDeps {
  document: () => EditorDocument;
  focusInput: () => void;
  download?: (blob: Blob, filename: string) => void;
  print?: (blob: Blob) => Promise<void> | void;
}

/**
 * Creates a document exporter with support for .docx and .pdf output, plus
 * printing the document via the same PDF pipeline.
 * @param deps - The dependencies required for exporting.
 * @returns An object with export/print methods.
 */
export function createDocumentExporter(deps: DocumentExporterDeps): {
  handleExportDocx: () => Promise<Blob>;
  handleExportPdf: () => Promise<Blob>;
  handlePrint: () => Promise<Blob>;
  exportDocxBlob: () => Promise<Blob>;
  exportPdfBlob: () => Promise<Blob>;
} {
  const download = deps.download ?? downloadBlob;
  const print = deps.print ?? printBlob;
  let printInFlight = false;

  const handleExportDocx = async (): Promise<Blob> => {
    const blob = await exportEditorDocumentToDocxBlobPreservingSource(
      deps.document(),
    );
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

  const exportDocxBlob = (): Promise<Blob> =>
    exportEditorDocumentToDocxBlobPreservingSource(deps.document());
  const exportPdfBlob = (): Promise<Blob> =>
    exportEditorDocumentToPdfBlob(deps.document());

  const handlePrint = async (): Promise<Blob> => {
    const blob = await exportEditorDocumentToPdfBlob(deps.document());
    if (!printInFlight) {
      printInFlight = true;
      try {
        await print(blob);
      } finally {
        printInFlight = false;
      }
    }
    deps.focusInput();
    return blob;
  };

  return {
    handleExportDocx,
    handleExportPdf,
    handlePrint,
    exportDocxBlob,
    exportPdfBlob,
  };
}

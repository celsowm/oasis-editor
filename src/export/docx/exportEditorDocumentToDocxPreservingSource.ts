import type { EditorDocument } from "@/core/model.js";
import {
  exportEditorDocumentToDocx,
  exportEditorDocumentToDocxBlob,
} from "./exportEditorDocumentToDocx.js";
import { patchRebuiltDocxWithHeaderFooterSourcePaths } from "./opc/headerFooterSourcePatcher.js";

export async function exportEditorDocumentToDocxPreservingSource(
  document: EditorDocument,
): Promise<ArrayBuffer> {
  if (!document.sourcePackage) {
    return exportEditorDocumentToDocx(document);
  }
  const rebuilt = await exportEditorDocumentToDocx(document);
  return patchRebuiltDocxWithHeaderFooterSourcePaths(document, rebuilt);
}

export async function exportEditorDocumentToDocxBlobPreservingSource(
  document: EditorDocument,
): Promise<Blob> {
  if (!document.sourcePackage) {
    return exportEditorDocumentToDocxBlob(document);
  }
  const buffer = await exportEditorDocumentToDocxPreservingSource(document);
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

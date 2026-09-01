import type {
  EditorDocument,
  EditorDocxSourcePackage,
} from "@/core/model.js";
import {
  exportEditorDocumentToDocx,
  exportEditorDocumentToDocxBlob,
} from "./exportEditorDocumentToDocx.js";
import { patchRebuiltDocxPreservingSource } from "./opc/sourceBackedDocxPatcher.js";
import { synchronizeBoundContentControls } from "./synchronizeBoundContentControls.js";

function cloneSourcePackage(
  sourcePackage: EditorDocxSourcePackage,
): EditorDocxSourcePackage {
  return {
    ...sourcePackage,
    contentTypes: {
      defaults: { ...sourcePackage.contentTypes.defaults },
      overrides: { ...sourcePackage.contentTypes.overrides },
    },
    rootRelationships: sourcePackage.rootRelationships.map((relationship) => ({
      ...relationship,
    })),
    parts: Object.fromEntries(
      Object.entries(sourcePackage.parts).map(([path, part]) => [
        path,
        {
          ...part,
          ...(part.relationships
            ? {
                relationships: part.relationships.map((relationship) => ({
                  ...relationship,
                })),
              }
            : {}),
        },
      ]),
    ),
    ...(sourcePackage.diagnostics
      ? {
          diagnostics: sourcePackage.diagnostics.map((diagnostic) => ({
            ...diagnostic,
          })),
        }
      : {}),
    ...(sourcePackage.rebuiltPartHashes
      ? { rebuiltPartHashes: { ...sourcePackage.rebuiltPartHashes } }
      : {}),
  };
}

export async function exportEditorDocumentToDocxPreservingSource(
  document: EditorDocument,
): Promise<ArrayBuffer> {
  if (!document.sourcePackage) {
    return exportEditorDocumentToDocx(document);
  }

  const exportDocument: EditorDocument = {
    ...document,
    sourcePackage: cloneSourcePackage(document.sourcePackage),
  };
  synchronizeBoundContentControls(exportDocument);

  const rebuilt = await exportEditorDocumentToDocx(exportDocument);
  return patchRebuiltDocxPreservingSource(exportDocument, rebuilt);
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

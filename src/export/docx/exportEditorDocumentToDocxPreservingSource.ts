import { auditOpaqueObjectPreservation, OpaqueObjectPreservationError } from "@/ooxml/word/opaqueObjects.js";
import { planOpaqueStoryRelocation } from "@/ooxml/word/opaqueStoryRelocation.js";
import { applyOpaqueStoryRelocation, expectedOpaqueRelocation } from "./opc/applyOpaqueStoryRelocation.js";
import { planOpaqueDependencyPruning, applyOpaqueDependencyPruning } from "./opc/opaqueDependencyPruning.js";
import type { EditorDocument, EditorDocxSourcePackage } from "@/core/model.js";
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

export interface DocxSourcePreservationOptions {
  /** Request an audit even without a recorded opaque inventory. Inventoried objects are always audited. */
  requireOpaquePreservation?: boolean;
  /** Default true. Prune only proven exclusive dependencies of explicit deletions. */
  pruneDeletedOpaqueDependencies?: boolean;
}

export async function exportEditorDocumentToDocxPreservingSource(
  document: EditorDocument,
  options: DocxSourcePreservationOptions = {},
): Promise<ArrayBuffer> {
  if (!document.sourcePackage) {
    return exportEditorDocumentToDocx(document);
  }

  const exportDocument: EditorDocument = {
    ...document,
    sourcePackage: cloneSourcePackage(document.sourcePackage),
  };
  synchronizeBoundContentControls(exportDocument);

  const hasOpaqueObjects = Boolean(document.sourcePackage.opaqueObjects?.length);
  const rebuilt = await exportEditorDocumentToDocx(exportDocument, { allowOpaqueSourceFragments: hasOpaqueObjects });
  let output = await patchRebuiltDocxPreservingSource(exportDocument, rebuilt);
  const relocation = document.opaqueRelocationIntent;
  const plan = relocation ? planOpaqueStoryRelocation(document.sourcePackage, relocation, relocation.destinationOwner) : undefined;
  if (plan) {
    if (document.opaqueDeletionIntents?.length) throw new Error("Cannot combine opaque deletion and relocation");
    output = await applyOpaqueStoryRelocation(output, plan);
  }
  if (hasOpaqueObjects || options.requireOpaquePreservation || plan) {
    const { captureDocxSourcePackage } = await import("@/import/docx/opc/sourcePackage.js");
    const outputPackage = await captureDocxSourcePackage(output);
    const diagnostics = auditOpaqueObjectPreservation(document.sourcePackage, outputPackage, document.opaqueDeletionIntents, plan ? expectedOpaqueRelocation(document.sourcePackage, plan) : undefined);
    if (diagnostics.length) throw new OpaqueObjectPreservationError(diagnostics);
    const intents = document.opaqueDeletionIntents ?? [];
    if (intents.length && options.pruneDeletedOpaqueDependencies !== false) {
      const plan = planOpaqueDependencyPruning(document.sourcePackage, outputPackage, intents);
      if (plan.removeEdges.length || plan.removeParts.length) {
        const pruned = await applyOpaqueDependencyPruning(output, plan);
        const afterPruning = await captureDocxSourcePackage(pruned);
        const finalDiagnostics = auditOpaqueObjectPreservation(document.sourcePackage, afterPruning, intents);
        if (finalDiagnostics.length) throw new OpaqueObjectPreservationError(finalDiagnostics);
        return pruned;
      }
    }
  }
  return output;
}

export async function exportEditorDocumentToDocxBlobPreservingSource(
  document: EditorDocument,
  options: DocxSourcePreservationOptions = {},
): Promise<Blob> {
  if (!document.sourcePackage) {
    return exportEditorDocumentToDocxBlob(document);
  }
  const buffer = await exportEditorDocumentToDocxPreservingSource(document, options);
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

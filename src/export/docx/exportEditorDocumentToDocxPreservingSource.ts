import { auditOpaqueObjectPreservation, inspectDocxOpaqueObjects, OpaqueObjectPreservationError } from "@/ooxml/word/opaqueObjects.js";
import { planOpaqueStoryRelocation } from "@/ooxml/word/opaqueStoryRelocation.js";
import { applyOpaqueStoryRelocation, expectedOpaqueRelocation } from "./opc/applyOpaqueStoryRelocation.js";
import { planOpaqueDependencyPruning, applyOpaqueDependencyPruning } from "./opc/opaqueDependencyPruning.js";
import type { EditorDocument, EditorDocxSourcePackage } from "@/core/model.js";
import {
  exportEditorDocumentToDocx,
  exportEditorDocumentToDocxBlob,
  rebuildDocxForSourceOverlay,
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
  /** Request an audit even if the fresh source scan finds no opaque objects. */
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

  // Old stored documents may predate the inventory or carry stale metadata.
  // Recompute it from the captured part data before making any export decision.
  const source = cloneSourcePackage(document.sourcePackage);
  const inspected = inspectDocxOpaqueObjects(source);
  const errors = inspected.diagnostics.filter(d => d.level === "error");
  if (errors.length) throw new OpaqueObjectPreservationError(errors);
  source.opaqueObjects = inspected.objects;
  const exportDocument: EditorDocument = { ...document, sourcePackage: source };
  synchronizeBoundContentControls(exportDocument);

  const hasOpaqueObjects = inspected.objects.length > 0;
  const relocation = document.opaqueRelocationIntent;
  const plan = relocation ? planOpaqueStoryRelocation(source, relocation, relocation.destinationOwner) : undefined;
  const rebuilt = await rebuildDocxForSourceOverlay(exportDocument, source);
  let output = await patchRebuiltDocxPreservingSource(exportDocument, rebuilt);
  if (plan) {
    if (document.opaqueDeletionIntents?.length) throw new Error("Cannot combine opaque deletion and relocation");
    output = await applyOpaqueStoryRelocation(output, plan);
  }
  if (hasOpaqueObjects || options.requireOpaquePreservation || plan || document.opaqueDeletionIntents?.length) {
    const { captureDocxSourcePackage } = await import("@/import/docx/opc/sourcePackage.js");
    const outputPackage = await captureDocxSourcePackage(output);
    const diagnostics = auditOpaqueObjectPreservation(source, outputPackage, document.opaqueDeletionIntents, plan ? expectedOpaqueRelocation(source, plan) : undefined);
    if (diagnostics.length) throw new OpaqueObjectPreservationError(diagnostics);
    const intents = document.opaqueDeletionIntents ?? [];
    if (intents.length && options.pruneDeletedOpaqueDependencies !== false) {
      const plan = planOpaqueDependencyPruning(source, outputPackage, intents);
      if (plan.removeEdges.length || plan.removeParts.length) {
        const pruned = await applyOpaqueDependencyPruning(output, plan);
        const afterPruning = await captureDocxSourcePackage(pruned);
        const finalDiagnostics = auditOpaqueObjectPreservation(source, afterPruning, intents);
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

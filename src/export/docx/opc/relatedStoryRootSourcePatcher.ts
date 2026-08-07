import JSZip from "jszip";
import type { EditorDocxSourcePackage } from "@/core/model.js";
import { mergeWordPartRootExtensionsFromSource } from "./wordPartRootSourcePatcher.js";

interface RelatedStoryRootSpec {
  relationshipSuffix: string;
  rebuiltPath: string;
  rootLocalName: string;
}

const STORY_ROOT_SPECS: RelatedStoryRootSpec[] = [
  {
    relationshipSuffix: "/footnotes",
    rebuiltPath: "word/footnotes.xml",
    rootLocalName: "footnotes",
  },
  {
    relationshipSuffix: "/endnotes",
    rebuiltPath: "word/endnotes.xml",
    rootLocalName: "endnotes",
  },
  {
    relationshipSuffix: "/comments",
    rebuiltPath: "word/comments.xml",
    rootLocalName: "comments",
  },
];

function sourceRelatedPartXml(
  sourcePackage: EditorDocxSourcePackage,
  relationshipSuffix: string,
): string | undefined {
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith(relationshipSuffix) &&
      Boolean(candidate.resolvedTarget),
  );
  const part = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return part?.kind === "xml" ? part.data : undefined;
}

/**
 * Preserves compatibility attributes, namespaces and non-Word extension
 * children at the roots of secondary WordprocessingML stories. Note/comment
 * entries themselves remain owned by their semantic serializers; this layer
 * intentionally does not resurrect a deleted `w:footnote`, `w:endnote` or
 * `w:comment`.
 */
export async function patchRebuiltRelatedStoryRootsFromSource(
  sourcePackage: EditorDocxSourcePackage,
  rebuilt: JSZip,
): Promise<boolean> {
  let changed = false;
  for (const spec of STORY_ROOT_SPECS) {
    const sourceXml = sourceRelatedPartXml(
      sourcePackage,
      spec.relationshipSuffix,
    );
    const rebuiltEntry = rebuilt.file(spec.rebuiltPath);
    if (!sourceXml || !rebuiltEntry) {
      continue;
    }
    const rebuiltXml = await rebuiltEntry.async("string");
    const mergedXml = mergeWordPartRootExtensionsFromSource(
      sourceXml,
      rebuiltXml,
      spec.rootLocalName,
    );
    if (mergedXml !== rebuiltXml) {
      rebuilt.file(spec.rebuiltPath, mergedXml);
      changed = true;
    }
  }
  return changed;
}

/**
 * Endnote layout: unlike footnotes (which reserve space at the bottom of every
 * page), endnotes are collected at the very end of the document. Rather than
 * duplicating the iterative footnote reservation machinery, we derive a
 * document whose last section has the referenced endnote bodies appended to
 * its block flow. Normal pagination then handles overflow onto new pages, and
 * block rendering / hit-testing are reused as-is.
 *
 * This transform is applied only for layout — the persisted model keeps the
 * endnote bodies in `document.endnotes`, and export reads them from there.
 */
import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorSection,
} from "@/core/model.js";
import { getFootnoteDisplayMarker } from "@/core/footnotes.js";
import { listReferencedEndnotes } from "@/core/endnotes.js";

const FLOW_ID_PREFIX = "endnote-flow";

function makeMarkerRun(
  endnoteId: string,
  marker: string,
): EditorParagraphNode["runs"][number] {
  return {
    id: `${FLOW_ID_PREFIX}:marker:${endnoteId}`,
    text: `${marker}. `,
    styles: { superscript: true },
    kind: "text",
  };
}

function prependMarker(
  paragraph: EditorParagraphNode,
  endnoteId: string,
  marker: string,
): EditorParagraphNode {
  return {
    ...paragraph,
    id: `${FLOW_ID_PREFIX}:p:${endnoteId}:${paragraph.id}`,
    runs: [makeMarkerRun(endnoteId, marker), ...paragraph.runs],
  };
}

function emptyMarkerParagraph(
  endnoteId: string,
  marker: string,
): EditorParagraphNode {
  return {
    id: `${FLOW_ID_PREFIX}:p:${endnoteId}:empty`,
    type: "paragraph",
    runs: [
      makeMarkerRun(endnoteId, marker),
      { id: `${FLOW_ID_PREFIX}:text:${endnoteId}`, text: "", kind: "text" },
    ],
  };
}

function spacerParagraph(): EditorParagraphNode {
  return {
    id: `${FLOW_ID_PREFIX}:spacer`,
    type: "paragraph",
    runs: [{ id: `${FLOW_ID_PREFIX}:spacer:text`, text: "", kind: "text" }],
  };
}

/**
 * Build the block list that renders every referenced endnote body, each tagged
 * with its display marker, in reading order.
 */
function buildEndnoteFlowBlocks(document: EditorDocument): EditorBlockNode[] {
  const referenced = listReferencedEndnotes(document);
  const items = document.endnotes?.items;
  if (!items || referenced.length === 0) {
    return [];
  }
  const format = document.endnotes?.settings?.numberFormat ?? "decimal";

  const out: EditorBlockNode[] = [spacerParagraph()];
  for (const ref of referenced) {
    const endnote = items[ref.endnoteId];
    if (!endnote) continue;
    const marker =
      ref.customMark ?? getFootnoteDisplayMarker(ref.index, format);
    const blocks = endnote.blocks;
    if (blocks.length === 0) {
      out.push(emptyMarkerParagraph(ref.endnoteId, marker));
      continue;
    }
    blocks.forEach((block, index): void => {
      if (index === 0 && block.type === "paragraph") {
        out.push(prependMarker(block, ref.endnoteId, marker));
        return;
      }
      if (index === 0) {
        // First block is a table: emit a marker paragraph before it.
        out.push(emptyMarkerParagraph(ref.endnoteId, marker));
      }
      out.push(block);
    });
  }
  return out;
}

/**
 * Return a document whose last section has the endnote flow appended. When the
 * document has no referenced endnotes the original document is returned
 * unchanged (referential equality preserved).
 */
export function injectEndnotesIntoDocument(
  document: EditorDocument,
): EditorDocument {
  const flowBlocks = buildEndnoteFlowBlocks(document);
  if (flowBlocks.length === 0) {
    return document;
  }
  const sections = document.sections;
  if (!sections || sections.length === 0) {
    return document;
  }
  const lastIndex = sections.length - 1;
  const nextSections: EditorSection[] = sections.map(
    (section, index): EditorSection =>
      index === lastIndex
        ? { ...section, blocks: [...section.blocks, ...flowBlocks] }
        : section,
  );
  return { ...document, sections: nextSections };
}

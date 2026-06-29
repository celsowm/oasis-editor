/**
 * Extracts the transient `__importedBookmark` markers (left on runs by
 * `paragraphs.ts`) into a document-level {@link EditorBookmarks} registry, then
 * strips the zero-length marker runs from the paragraphs.
 *
 * Anchors are stored as `{ paragraphId, offset }` where `offset` is the
 * character position in the paragraph's flattened text. Because markers ride
 * the run stream, every imported offset coincides with a run boundary.
 */
import type {
  EditorBlockNode,
  EditorBookmark,
  EditorBookmarks,
  EditorBookmarkAnchor,
  EditorSection,
  EditorTextRun,
} from "@/core/model.js";
import { createEditorBookmarkId, createEditorRun } from "@/core/editorState.js";
import type { ImportedBookmarkMarker } from "./runs/types.js";

type RunWithBookmark = EditorTextRun & {
  __importedBookmark?: ImportedBookmarkMarker;
};

interface CollectedBoundary {
  marker: ImportedBookmarkMarker;
  anchor: EditorBookmarkAnchor;
}

/** Word's transient cursor-return bookmark; never round-tripped. */
const RESERVED_BOOKMARK_NAMES = new Set(["_GoBack"]);

function collectFromBlock(
  block: EditorBlockNode,
  out: CollectedBoundary[],
  seqRef: { value: number },
): void {
  if (block.type === "paragraph") {
    let offset = 0;
    const kept: EditorTextRun[] = [];
    for (const run of block.runs) {
      const marker = (run as RunWithBookmark).__importedBookmark;
      if (marker) {
        out.push({
          marker,
          anchor: {
            paragraphId: block.id,
            offset,
            seq: seqRef.value,
          },
        });
        seqRef.value += 1;
        // Drop the zero-length marker run from the model.
        continue;
      }
      offset += run.text.length;
      kept.push(run);
    }
    if (kept.length !== block.runs.length) {
      block.runs = kept.length > 0 ? kept : [createEditorRun("")];
    }
    return;
  }
  for (const row of block.rows) {
    for (const cell of row.cells) {
      for (const child of cell.blocks) {
        collectFromBlock(child, out, seqRef);
      }
    }
  }
}

/**
 * Walk all stories in the imported sections, collect bookmark boundaries, pair
 * them by DOCX id and return the registry (or `undefined` when there are none).
 * Mutates the paragraphs in place to remove the transient marker runs.
 */
export function extractBookmarksFromSections(
  sections: EditorSection[],
): EditorBookmarks | undefined {
  const boundaries: CollectedBoundary[] = [];
  const seqRef = { value: 0 };
  const visit = (blocks: EditorBlockNode[] | undefined): void => {
    blocks?.forEach((block): void => collectFromBlock(block, boundaries, seqRef));
  };

  for (const section of sections) {
    visit(section.blocks);
    visit(section.header);
    visit(section.firstPageHeader);
    visit(section.evenPageHeader);
    visit(section.footer);
    visit(section.firstPageFooter);
    visit(section.evenPageFooter);
  }

  if (boundaries.length === 0) {
    return undefined;
  }

  // Pair starts and ends by DOCX id. Valid DOCX uses a unique id per bookmark;
  // duplicates are paired index-wise in document order so malformed files don't
  // crash the importer.
  const startsByDocxId = new Map<string, CollectedBoundary[]>();
  const endsByDocxId = new Map<string, CollectedBoundary[]>();
  for (const boundary of boundaries) {
    const bucket =
      boundary.marker.kind === "start" ? startsByDocxId : endsByDocxId;
    const list = bucket.get(boundary.marker.docxId);
    if (list) {
      list.push(boundary);
    } else {
      bucket.set(boundary.marker.docxId, [boundary]);
    }
  }

  const items: Record<string, EditorBookmark> = {};
  const order: string[] = [];

  // Iterate starts in document order so the registry order is deterministic.
  const startBoundaries = boundaries.filter((b): boolean => b.marker.kind === "start");
  for (const startBoundary of startBoundaries) {
    const { marker, anchor } = startBoundary;
    const name = marker.name;
    if (!name || RESERVED_BOOKMARK_NAMES.has(name)) {
      continue;
    }
    const docxIdNum = Number.parseInt(marker.docxId, 10);
    const endBoundary = endsByDocxId.get(marker.docxId)?.shift();

    const id = createEditorBookmarkId();
    const bookmark: EditorBookmark = {
      id,
      name,
      start: anchor,
    };
    if (name.startsWith("_")) {
      bookmark.hidden = true;
    }
    if (!Number.isNaN(docxIdNum)) {
      bookmark.docxIdHint = docxIdNum;
    }
    if (marker.colFirst !== undefined) {
      bookmark.colFirst = marker.colFirst;
    }
    if (marker.colLast !== undefined) {
      bookmark.colLast = marker.colLast;
    }
    if (endBoundary) {
      bookmark.end = endBoundary.anchor;
    }
    items[id] = bookmark;
    order.push(id);
  }

  if (order.length === 0) {
    return undefined;
  }
  return { items, order };
}

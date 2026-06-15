/**
 * Extracts the transient `__importedComment` markers (left on runs by
 * `paragraphs.ts`) into per-`docxId` start/end anchors, then strips the
 * zero-length marker runs from the paragraphs.
 *
 * This is the comment counterpart of `bookmarks.ts`. It resolves only the
 * *range* half of a comment; the import driver joins these ranges with the
 * comment *bodies* parsed from `word/comments.xml` to build the final
 * {@link EditorComments} registry.
 *
 * Anchors are stored as `{ paragraphId, offset }` where `offset` is the
 * character position in the paragraph's flattened text. Because markers ride
 * the run stream, every imported offset coincides with a run boundary.
 */
import type {
  EditorBlockNode,
  EditorCommentAnchor,
  EditorSection,
  EditorTextRun,
} from "../../core/model.js";
import { createEditorRun } from "../../core/editorState.js";
import type { ImportedCommentMarker } from "./runs/types.js";

type RunWithComment = EditorTextRun & {
  __importedComment?: ImportedCommentMarker;
};

interface CollectedBoundary {
  marker: ImportedCommentMarker;
  anchor: EditorCommentAnchor;
}

export interface CommentRange {
  start?: EditorCommentAnchor;
  end?: EditorCommentAnchor;
}

function collectFromBlock(
  block: EditorBlockNode,
  out: CollectedBoundary[],
  seqRef: { value: number },
): void {
  if (block.type === "paragraph") {
    let offset = 0;
    const kept: EditorTextRun[] = [];
    for (const run of block.runs) {
      const marker = (run as RunWithComment).__importedComment;
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
 * Walk all stories in the imported sections, collect comment range boundaries,
 * pair them by DOCX id and return a `docxId -> { start, end }` map. Mutates the
 * paragraphs in place to remove the transient marker runs.
 */
export function extractCommentRangesFromSections(
  sections: EditorSection[],
): Map<string, CommentRange> {
  const boundaries: CollectedBoundary[] = [];
  const seqRef = { value: 0 };
  const visit = (blocks: EditorBlockNode[] | undefined): void => {
    blocks?.forEach((block) => collectFromBlock(block, boundaries, seqRef));
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

  const ranges = new Map<string, CommentRange>();
  for (const { marker, anchor } of boundaries) {
    const range = ranges.get(marker.docxId) ?? {};
    if (marker.kind === "start") {
      range.start = anchor;
    } else {
      range.end = anchor;
    }
    ranges.set(marker.docxId, range);
  }
  return ranges;
}

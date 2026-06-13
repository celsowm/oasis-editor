import type {
  EditorBlockNode,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTextRun,
} from "../../../core/model.js";
import type { DocContext } from "../docxTypes.js";
import type { BookmarkBoundaryEvent } from "../bookmarksXml.js";
import { serializeBookmarkEvent } from "../bookmarksXml.js";
import { serializeTableXml } from "../tableXml.js";
import { serializeParagraphProperties } from "./paragraphPropertiesXml.js";
import { serializeRunWithRelationships } from "./runXml.js";
import { serializeDropCapFrameParagraph } from "./dropCapXml.js";

/**
 * A run whose text can be safely sliced when a bookmark boundary falls inside
 * it (no image/textbox/field/note reference to keep atomic).
 */
function isSplittableTextRun(run: EditorTextRun): boolean {
  return (
    !run.image &&
    !run.textBox &&
    !run.field &&
    !run.fieldChar &&
    run.fieldInstruction === undefined &&
    !run.footnoteReference &&
    !run.endnoteReference
  );
}

/**
 * Serialize a paragraph's runs, interleaving bookmark start/end markers at
 * their character offsets. Splittable text runs are virtually sliced so a
 * boundary can land mid-run; other runs stay atomic (boundaries inside them are
 * emitted just before the run).
 */
function serializeRunsWithBookmarks(
  runs: EditorTextRun[],
  events: BookmarkBoundaryEvent[],
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const sorted = [...events].sort(
    (a, b) => a.offset - b.offset || a.seq - b.seq,
  );
  let ei = 0;
  let pos = 0;
  let out = "";

  const flushUpTo = (limit: number): void => {
    while (ei < sorted.length && sorted[ei]!.offset <= limit) {
      out += serializeBookmarkEvent(sorted[ei]!);
      ei += 1;
    }
  };

  for (const run of runs) {
    const runStart = pos;
    const runEnd = runStart + run.text.length;
    // Boundaries at or before this run's start.
    flushUpTo(runStart);

    if (isSplittableTextRun(run) && run.text.length > 0) {
      let cursor = runStart;
      while (ei < sorted.length && sorted[ei]!.offset < runEnd) {
        const event = sorted[ei]!;
        if (event.offset > cursor) {
          out += serializeRunWithRelationships(
            {
              ...run,
              text: run.text.slice(cursor - runStart, event.offset - runStart),
            },
            context,
            paragraphStyleId,
            styles,
          );
        }
        out += serializeBookmarkEvent(event);
        ei += 1;
        cursor = event.offset;
      }
      if (cursor < runEnd) {
        out += serializeRunWithRelationships(
          { ...run, text: run.text.slice(cursor - runStart) },
          context,
          paragraphStyleId,
          styles,
        );
      }
    } else {
      out += serializeRunWithRelationships(
        run,
        context,
        paragraphStyleId,
        styles,
      );
    }
    pos = runEnd;
  }

  // Trailing boundaries at the paragraph end (or clamped beyond it).
  flushUpTo(Number.POSITIVE_INFINITY);
  return out;
}

export function serializeBlocksXml(
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  return blocks
    .map((block) => {
      if (block.type === "table") {
        const pageBreakXml = block.style?.pageBreakBefore
          ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
          : "";
        return (
          pageBreakXml +
          serializeTableXml(block, (paragraph, cell) =>
            serializeParagraphXml(paragraph, context, styles, {
              align: cell.style?.horizontalAlign,
            }),
          )
        );
      }
      return serializeParagraphXml(block, context, styles);
    })
    .join("");
}

export function serializeParagraphXml(
  paragraph: EditorParagraphNode,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  overrides?: { align?: EditorParagraphStyle["align"] },
): string {
  const runs =
    paragraph.runs.length > 0 ? paragraph.runs : [{ id: "", text: "" }];
  // A drop cap is emitted as a preceding standalone frame paragraph (Word's
  // representation); the body paragraph itself serializes unchanged.
  const dropCapFrame = paragraph.dropCap
    ? serializeDropCapFrameParagraph(paragraph.dropCap)
    : "";
  const bookmarkEvents = context.bookmarkEventsByParagraph?.get(paragraph.id);
  const runsXml =
    bookmarkEvents && bookmarkEvents.length > 0
      ? serializeRunsWithBookmarks(
          runs as EditorTextRun[],
          bookmarkEvents,
          context,
          paragraph.style?.styleId,
          styles,
        )
      : runs
          .map((run) =>
            serializeRunWithRelationships(
              run,
              context,
              paragraph.style?.styleId,
              styles,
            ),
          )
          .join("");
  return `${dropCapFrame}<w:p>${serializeParagraphProperties(
    paragraph,
    context.numberingInfo,
    styles,
    overrides,
  )}${runsXml}</w:p>`;
}

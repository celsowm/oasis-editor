import type {
  EditorBlockNode,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTextRun,
} from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import type { BookmarkBoundaryEvent } from "@/export/docx/bookmarksXml.js";
import { serializeBookmarkEvent } from "@/export/docx/bookmarksXml.js";
import type { CommentBoundaryEvent } from "@/export/docx/commentsXml.js";
import { serializeCommentRangeEvent } from "@/export/docx/commentsXml.js";
import { serializeTableXml } from "@/export/docx/tableXml.js";
import { assertNever } from "@/core/assertNever.js";
import { serializeParagraphProperties } from "./paragraphPropertiesXml.js";
import { serializeRunWithRelationships } from "./runXml.js";
import { serializeDropCapFrameParagraph } from "./dropCapXml.js";

/**
 * A run whose text can be safely sliced when a bookmark boundary falls inside
 * it (no image/textbox/field/note reference to keep atomic).
 */
function isSplittableTextRun(run: EditorTextRun): boolean {
  // Only plain text and `w:sym` runs may be sliced at a boundary; every other
  // kind carries an inline object/marker that must stay atomic.
  return run.kind === "text" || run.kind === "sym";
}

/**
 * A pre-serialized zero-width insertion (a bookmark/comment range marker, or the
 * standalone `w:commentReference` run) to splice into the run stream at
 * `offset`. `seq` breaks ties between boundaries that share an offset.
 */
interface BoundaryToken {
  offset: number;
  seq: number;
  xml: string;
}

/**
 * Serialize a paragraph's runs, interleaving bookmark/comment boundary tokens at
 * their character offsets. Splittable text runs are virtually sliced so a
 * boundary can land mid-run; other runs stay atomic (boundaries inside them are
 * emitted just before the run).
 */
function serializeRunsWithBoundaries(
  runs: EditorTextRun[],
  tokens: BoundaryToken[],
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const sorted = [...tokens].sort(
    (a, b) => a.offset - b.offset || a.seq - b.seq,
  );
  let ei = 0;
  let pos = 0;
  let out = "";

  const flushUpTo = (limit: number): void => {
    while (ei < sorted.length && sorted[ei]!.offset <= limit) {
      out += sorted[ei]!.xml;
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
        const token = sorted[ei]!;
        if (token.offset > cursor) {
          out += serializeRunWithRelationships(
            {
              ...run,
              text: run.text.slice(cursor - runStart, token.offset - runStart),
            },
            context,
            paragraphStyleId,
            styles,
            serializeBlocksXml,
          );
        }
        out += token.xml;
        ei += 1;
        cursor = token.offset;
      }
      if (cursor < runEnd) {
        out += serializeRunWithRelationships(
          { ...run, text: run.text.slice(cursor - runStart) },
          context,
          paragraphStyleId,
          styles,
          serializeBlocksXml,
        );
      }
    } else {
      out += serializeRunWithRelationships(
        run,
        context,
        paragraphStyleId,
        styles,
        serializeBlocksXml,
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
      switch (block.type) {
        case "paragraph":
          return serializeParagraphXml(block, context, styles);
        case "table": {
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
        default:
          return assertNever(block, "block");
      }
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
    paragraph.runs.length > 0
      ? paragraph.runs
      : [{ id: "", text: "", kind: "text" as const }];
  // A drop cap is emitted as a preceding standalone frame paragraph (Word's
  // representation); the body paragraph itself serializes unchanged.
  const dropCapFrame = paragraph.dropCap
    ? serializeDropCapFrameParagraph(paragraph.dropCap)
    : "";
  const bookmarkEvents = context.bookmarkEventsByParagraph?.get(paragraph.id);
  const commentEvents = context.commentEventsByParagraph?.get(paragraph.id);
  const boundaryTokens: BoundaryToken[] = [
    ...(bookmarkEvents ?? []).map((e: BookmarkBoundaryEvent) => ({
      offset: e.offset,
      seq: e.seq,
      xml: serializeBookmarkEvent(e),
    })),
    ...(commentEvents ?? []).map((e: CommentBoundaryEvent) => ({
      offset: e.offset,
      seq: e.seq,
      xml: serializeCommentRangeEvent(e),
    })),
  ];
  const runsXml =
    boundaryTokens.length > 0
      ? serializeRunsWithBoundaries(
          runs as EditorTextRun[],
          boundaryTokens,
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
              serializeBlocksXml,
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

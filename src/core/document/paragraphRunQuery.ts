import type {
  EditorParagraphNode,
  EditorTextRun,
  EditorTextStyle,
} from "@/core/model.js";
import { getParagraphLength, isInlineObjectRun } from "@/core/model.js";
import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";
import { cloneRun } from "./clone.js";

export function getStyleAtOffset(
  paragraph: EditorParagraphNode,
  offset: number,
): EditorTextStyle | undefined {
  if (paragraph.runs.length === 0) {
    return undefined;
  }

  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index];
    const nextConsumed = consumed + run.text.length;

    if (offset < nextConsumed) {
      return cloneStyle(run.styles);
    }

    if (offset === nextConsumed) {
      if (run.text.length > 0) {
        return cloneStyle(run.styles);
      }
      const nextRun = paragraph.runs[index + 1];
      return cloneStyle(nextRun?.styles ?? run.styles);
    }

    consumed = nextConsumed;
  }

  return cloneStyle(paragraph.runs[paragraph.runs.length - 1]?.styles);
}

export function getRunAtOffset(
  paragraph: EditorParagraphNode,
  offset: number,
): { run: EditorTextRun; startOffset: number; endOffset: number } | null {
  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const startOffset = consumed;
    const endOffset = consumed + run.text.length;

    if (offset < endOffset) {
      return { run, startOffset, endOffset };
    }

    if (offset === endOffset) {
      if (run.text.length > 0) {
        return { run, startOffset, endOffset };
      }
      const nextRun = paragraph.runs[index + 1];
      if (nextRun) {
        return {
          run: nextRun,
          startOffset: endOffset,
          endOffset: endOffset + nextRun.text.length,
        };
      }
      return { run, startOffset, endOffset };
    }

    consumed = endOffset;
  }

  return null;
}

export function expandLinkRangeInParagraph(
  paragraph: EditorParagraphNode,
  offset: number,
): { href: string; startOffset: number; endOffset: number } | null {
  const resolved = getRunAtOffset(paragraph, offset);
  const href = resolved?.run.styles?.link;
  if (!resolved || !href || resolved.run.kind === "image") {
    return null;
  }

  let startOffset = resolved.startOffset;
  let endOffset = resolved.endOffset;
  let consumed = 0;
  const runs = paragraph.runs;
  const runIndex = runs.findIndex((run) => run.id === resolved.run.id);
  if (runIndex === -1) {
    return null;
  }

  for (let index = 0; index < runIndex; index += 1) {
    consumed += runs[index]!.text.length;
  }

  startOffset = consumed;
  endOffset = consumed + resolved.run.text.length;

  for (let index = runIndex - 1; index >= 0; index -= 1) {
    const run = runs[index]!;
    if (run.kind === "image" || run.styles?.link !== href) {
      break;
    }
    startOffset -= run.text.length;
  }

  for (let index = runIndex + 1; index < runs.length; index += 1) {
    const run = runs[index]!;
    if (run.kind === "image" || run.styles?.link !== href) {
      break;
    }
    endOffset += run.text.length;
  }

  return { href, startOffset, endOffset };
}

export function sliceRuns(
  paragraph: EditorParagraphNode,
  startOffset: number,
  endOffset: number,
): EditorTextRun[] {
  const start = Math.max(
    0,
    Math.min(startOffset, getParagraphLength(paragraph)),
  );
  const end = Math.max(
    start,
    Math.min(endOffset, getParagraphLength(paragraph)),
  );
  const pieces: EditorTextRun[] = [];

  let consumed = 0;
  for (const run of paragraph.runs) {
    const runStart = consumed;
    const runEnd = consumed + run.text.length;
    const overlapStart = Math.max(start, runStart);
    const overlapEnd = Math.min(end, runEnd);

    if (overlapStart < overlapEnd) {
      // Deep-clone the source run, then give the slice its own id and (for plain
      // text/marker runs) the sliced text. Inline objects keep their \uFFFC text.
      const piece = cloneRun(run);
      piece.id = `run:${Math.random().toString(36).slice(2, 9)}`;
      if (!isInlineObjectRun(run)) {
        piece.text = run.text.slice(
          overlapStart - runStart,
          overlapEnd - runStart,
        );
      }
      pieces.push(piece);
    }

    consumed = runEnd;
  }

  return pieces;
}

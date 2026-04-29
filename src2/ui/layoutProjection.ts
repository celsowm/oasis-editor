import type {
  Editor2CaretSlot,
  Editor2LayoutFragment,
  Editor2LayoutFragmentChar,
  Editor2LayoutLine,
  Editor2LayoutParagraph,
  Editor2ParagraphNode,
} from "../core/model.js";
import { getParagraphText } from "../core/model.js";
import { measureLinesFromRects, type CharRect } from "./caretGeometry.js";

function sliceFragmentToRange(
  fragment: Editor2LayoutFragment,
  startOffset: number,
  endOffset: number,
): Editor2LayoutFragment | null {
  const start = Math.max(startOffset, fragment.startOffset);
  const end = Math.min(endOffset, fragment.endOffset);
  if (start >= end) {
    return null;
  }

  const chars = fragment.chars.filter(
    (char) => char.paragraphOffset >= start && char.paragraphOffset < end,
  );

  return {
    paragraphId: fragment.paragraphId,
    runId: fragment.runId,
    startOffset: start,
    endOffset: end,
    text: chars.map((char) => char.char).join(""),
    styles: fragment.styles ? { ...fragment.styles } : undefined,
    chars,
  };
}

export function projectParagraphLayout(paragraph: Editor2ParagraphNode): Editor2LayoutParagraph {
  let paragraphOffset = 0;
  const fragments: Editor2LayoutFragment[] = paragraph.runs.map((run) => {
    const chars: Editor2LayoutFragmentChar[] = Array.from(run.text).map((char, index) => ({
      char,
      paragraphOffset: paragraphOffset + index,
      runOffset: index,
    }));

    const fragment: Editor2LayoutFragment = {
      paragraphId: paragraph.id,
      runId: run.id,
      startOffset: paragraphOffset,
      endOffset: paragraphOffset + run.text.length,
      text: run.text,
      styles: run.styles ? { ...run.styles } : undefined,
      chars,
    };

    paragraphOffset += run.text.length;
    return fragment;
  });

  const lines: Editor2LayoutLine[] = [
    {
      paragraphId: paragraph.id,
      index: 0,
      startOffset: 0,
      endOffset: paragraphOffset,
      top: 0,
      height: 28,
      slots: Array.from({ length: paragraphOffset + 1 }, (_, offset) => ({
        paragraphId: paragraph.id,
        offset,
        left: 0,
        top: 0,
        height: 28,
      })),
      fragments,
    },
  ];

  return {
    paragraphId: paragraph.id,
    text: getParagraphText(paragraph),
    fragments,
    lines,
  };
}

export function measureParagraphLayoutFromRects(
  paragraph: Editor2ParagraphNode,
  charRects: CharRect[],
): Editor2LayoutParagraph {
  const projected = projectParagraphLayout(paragraph);
  const measuredLines = measureLinesFromRects(charRects);

  return {
    ...projected,
    lines: measuredLines.map((line) => {
      const slots: Editor2CaretSlot[] = line.slots.map((slot) => ({
        paragraphId: paragraph.id,
        offset: slot.offset,
        left: slot.left,
        top: slot.top,
        height: slot.height,
      }));

      return {
        paragraphId: paragraph.id,
        index: line.index,
        startOffset: line.startOffset,
        endOffset: line.endOffset,
        top: line.top,
        height: line.height,
        slots,
        fragments: projected.fragments
          .map((fragment) => sliceFragmentToRange(fragment, line.startOffset, line.endOffset))
          .filter((fragment): fragment is Editor2LayoutFragment => fragment !== null),
      };
    }),
  };
}

export function resolveClosestOffsetInMeasuredLayout(
  layout: Editor2LayoutParagraph,
  clientX: number,
  clientY: number,
): number {
  const slots = layout.lines.flatMap((line) => line.slots);
  if (slots.length === 0) {
    return 0;
  }

  let bestOffset = slots[0]!.offset;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const slot of slots) {
    const verticalDelta =
      clientY < slot.top ? slot.top - clientY : clientY > slot.top + slot.height ? clientY - (slot.top + slot.height) : 0;
    const horizontalDelta = Math.abs(clientX - slot.left);
    const score = verticalDelta * 1000 + horizontalDelta;

    if (score < bestScore) {
      bestScore = score;
      bestOffset = slot.offset;
    }
  }

  return bestOffset;
}

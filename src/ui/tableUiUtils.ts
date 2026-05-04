import {
  measureParagraphLayoutFromRects,
  resolveClosestOffsetInMeasuredLayout,
} from "./layoutProjection.js";

export function resolveClickOffset(
  event: MouseEvent & { currentTarget: HTMLParagraphElement },
  layoutParagraph: ReturnType<typeof measureParagraphLayoutFromRects>,
): number {
  if (layoutParagraph.text.length === 0) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(
      layoutParagraph.text.length,
      resolveClosestOffsetInMeasuredLayout(layoutParagraph, event.clientX, event.clientY),
    ),
  );
}

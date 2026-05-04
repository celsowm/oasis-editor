import {
  LogicalPosition,
  LogicalRange,
} from "../../core/selection/SelectionTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PositionCalculator } from "./PositionCalculator.js";
import { Logger } from "../../core/utils/Logger.js";

export interface CaretRect {
  x: number;
  y: number;
  height: number;
  pageId: string;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  pageId: string;
}

export class SelectionMapper {
  private layout: LayoutState;
  private measurer: TextMeasurer;
  private positionCalculator: PositionCalculator;

  constructor(layout: LayoutState, measurer: TextMeasurer) {
    this.layout = layout;
    this.measurer = measurer;
    this.positionCalculator = new PositionCalculator(layout);
  }

  getCaretRect(position: LogicalPosition): CaretRect | null {
    if (!position) return null;
    Logger.debug("SELECTION: getCaretRect:start", { position });

    const fragment =
      this.positionCalculator.getFragmentContainingPosition(position);
    if (!fragment) {
      Logger.debug("SELECTION: getCaretRect:no-fragment", { position });
      return null;
    }

    const y = this.positionCalculator.calculateYPosition(position);
    const xOffset = this.positionCalculator.calculateXOffset(
      position,
      fragment,
      this.measurer,
    );

    const lineHeight =
      fragment.lines?.[0]?.height ?? fragment.typography.fontSize * 1.5;

    return {
      x: fragment.rect.x + xOffset,
      y: y!,
      height: lineHeight,
      pageId: fragment.pageId,
    };
  }

  getSelectionRects(range: LogicalRange): SelectionRect[] {
    Logger.debug("SELECTION: getSelectionRects:start", { range });
    const { start, end } = range;

    const startRect = this.getCaretRect(start);
    const endRect = this.getCaretRect(end);

    if (!startRect || !endRect) {
      Logger.debug("SELECTION: getSelectionRects:no-rects", {
        startRect,
        endRect,
      });
      return [];
    }

    const absStartOffset = this.positionCalculator.getOffsetInBlock(start);
    const absEndOffset = this.positionCalculator.getOffsetInBlock(end);

    let visualStart: LogicalPosition | null = null;
    let visualEnd: LogicalPosition | null = null;
    let visualStartAbs = 0;
    let visualEndAbs = 0;

    for (const page of this.layout.pages) {
      const allPageFragments = [
        ...page.headerFragments,
        ...page.fragments,
        ...page.footerFragments,
        ...page.footnoteFragments,
      ];
      for (const fragment of allPageFragments) {
        if (
          fragment.blockId === start.blockId &&
          fragment.blockId === end.blockId
        ) {
          if (absStartOffset <= absEndOffset) {
            visualStart = start;
            visualEnd = end;
            visualStartAbs = absStartOffset;
            visualEndAbs = absEndOffset;
          } else {
            visualStart = end;
            visualEnd = start;
            visualStartAbs = absEndOffset;
            visualEndAbs = absStartOffset;
          }
          break;
        }
        if (fragment.blockId === start.blockId && !visualStart) {
          visualStart = start;
          visualEnd = end;
          visualStartAbs = absStartOffset;
          visualEndAbs = absEndOffset;
          break;
        }
        if (fragment.blockId === end.blockId && !visualStart) {
          visualStart = end;
          visualEnd = start;
          visualStartAbs = absEndOffset;
          visualEndAbs = absStartOffset;
          break;
        }
      }
      if (visualStart) break;
    }

    if (!visualStart || !visualEnd) {
      Logger.debug("SELECTION: getSelectionRects:no-visual-range", {
        absStartOffset,
        absEndOffset,
      });
      return [];
    }

    const vStartRect = visualStart === start ? startRect : endRect;
    const vEndRect = visualEnd === end ? endRect : startRect;

    const rects: SelectionRect[] = [];
    let inSelection = false;
    let done = false;

    for (const page of this.layout.pages) {
      const allPageFragments = [
        ...page.headerFragments,
        ...page.fragments,
        ...page.footerFragments,
        ...page.footnoteFragments,
      ];
      for (const fragment of allPageFragments) {
        if (!fragment.lines) continue;

        for (const line of fragment.lines) {
          let lineMatchesStart = false;
          let lineMatchesEnd = false;

          if (
            !inSelection &&
            fragment.blockId === visualStart.blockId &&
            visualStartAbs >= line.offsetStart &&
            visualStartAbs <= line.offsetEnd
          ) {
            inSelection = true;
            lineMatchesStart = true;
          }

          if (
            inSelection &&
            fragment.blockId === visualEnd.blockId &&
            visualEndAbs >= line.offsetStart &&
            visualEndAbs <= line.offsetEnd
          ) {
            lineMatchesEnd = true;
            done = true;
          }

          if (inSelection) {
            let x = fragment.rect.x;
            let width = line.width ?? fragment.rect.width;

            if (lineMatchesStart && lineMatchesEnd) {
              x = vStartRect.x;
              width = Math.max(vEndRect.x - vStartRect.x, 2);
            } else if (lineMatchesStart) {
              x = vStartRect.x;
              const lineEndX =
                fragment.rect.x + (line.width ?? fragment.rect.width);
              width = Math.max(lineEndX - vStartRect.x, 2);
            } else if (lineMatchesEnd) {
              x = fragment.rect.x;
              width = Math.max(vEndRect.x - fragment.rect.x, 2);
            }

            if (width > 0) {
              rects.push({
                x,
                y: line.y,
                width,
                height: line.height,
                pageId: page.id,
              });
            }
          }

          if (done) break;
        }
        if (done) break;
      }
      if (done) break;
    }

    Logger.debug("SELECTION: getSelectionRects:end", {
      rectCount: rects.length,
      rects,
    });
    return rects;
  }
}

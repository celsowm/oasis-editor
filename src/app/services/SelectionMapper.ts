import {
  LogicalPosition,
  LogicalRange,
} from "../../core/selection/SelectionTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { LayoutFragment, LineInfo } from "../../core/layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PositionCalculator } from "./PositionCalculator.js";

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

    const fragment = this.positionCalculator.getFragmentContainingPosition(position);
    if (!fragment) return null;

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

  /**
   * Calculates the set of rectangles that represent the selection for a given logical range.
   * Selection can span multiple lines, fragments, and pages.
   */
  getSelectionRects(range: LogicalRange): SelectionRect[] {
    const { start, end } = range;

    // Get carets for both ends of the range to facilitate width calculations
    const startCaret = this.getCaretRect(start);
    const endCaret = this.getCaretRect(end);

    if (!startCaret || !endCaret) return [];

    // Ensure we process the range from top-to-bottom in the document flow
    const normalized = this.normalizeRange(range);
    if (!normalized) return [];

    const { visualStart, visualEnd, visualStartAbs, visualEndAbs } = normalized;

    const visualStartCaret = visualStart === start ? startCaret : endCaret;
    const visualEndCaret = visualEnd === end ? endCaret : startCaret;

    const rects: SelectionRect[] = [];
    let isCurrentlyInSelection = false;
    let isSelectionFinished = false;

    for (const page of this.layout.pages) {
      for (const fragment of page.fragments) {
        if (!fragment.lines) continue;

        for (const line of fragment.lines) {
          const isLineWhereSelectionStarts =
            !isCurrentlyInSelection &&
            fragment.blockId === visualStart.blockId &&
            visualStartAbs >= line.offsetStart &&
            visualStartAbs <= line.offsetEnd;

          if (isLineWhereSelectionStarts) {
            isCurrentlyInSelection = true;
          }

          const isLineWhereSelectionEnds =
            isCurrentlyInSelection &&
            fragment.blockId === visualEnd.blockId &&
            visualEndAbs >= line.offsetStart &&
            visualEndAbs <= line.offsetEnd;

          if (isLineWhereSelectionEnds) {
            isSelectionFinished = true;
          }

          if (isCurrentlyInSelection) {
            const rect = this.calculateRectForLine(
              line,
              fragment,
              page.id,
              isLineWhereSelectionStarts,
              isLineWhereSelectionEnds,
              visualStartCaret.x,
              visualEndCaret.x,
            );

            if (rect) {
              rects.push(rect);
            }
          }

          if (isSelectionFinished) break;
        }
        if (isSelectionFinished) break;
      }
      if (isSelectionFinished) break;
    }

    return rects;
  }

  /**
   * Normalizes a selection range so that visualStart always appears before visualEnd
   * in the document flow. This handles cases where the user selects text backwards.
   */
  private normalizeRange(range: LogicalRange) {
    const { start, end } = range;
    const absStartOffset = this.positionCalculator.getOffsetInBlock(start);
    const absEndOffset = this.positionCalculator.getOffsetInBlock(end);

    let visualStart: LogicalPosition | null = null;
    let visualEnd: LogicalPosition | null = null;
    let visualStartAbs = 0;
    let visualEndAbs = 0;

    // Scan the layout to see which block (start or end) appears first.
    for (const page of this.layout.pages) {
      for (const fragment of page.fragments) {
        const isStartBlock = fragment.blockId === start.blockId;
        const isEndBlock = fragment.blockId === end.blockId;

        if (isStartBlock && isEndBlock) {
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

        if (isStartBlock && !visualStart) {
          visualStart = start;
          visualEnd = end;
          visualStartAbs = absStartOffset;
          visualEndAbs = absEndOffset;
          break;
        }

        if (isEndBlock && !visualStart) {
          visualStart = end;
          visualEnd = start;
          visualStartAbs = absEndOffset;
          visualEndAbs = absStartOffset;
          break;
        }
      }
      if (visualStart) break;
    }

    if (!visualStart || !visualEnd) return null;

    return { visualStart, visualEnd, visualStartAbs, visualEndAbs };
  }

  /**
   * Calculates the selection rectangle for a single line of text.
   */
  private calculateRectForLine(
    line: LineInfo,
    fragment: LayoutFragment,
    pageId: string,
    isLineStart: boolean,
    isLineEnd: boolean,
    visualStartX: number,
    visualEndX: number,
  ): SelectionRect | null {
    let x = fragment.rect.x;
    let width = line.width ?? fragment.rect.width;

    if (isLineStart && isLineEnd) {
      x = visualStartX;
      width = Math.max(visualEndX - visualStartX, 2);
    } else if (isLineStart) {
      x = visualStartX;
      const lineEndX = fragment.rect.x + (line.width ?? fragment.rect.width);
      width = Math.max(lineEndX - visualStartX, 2);
    } else if (isLineEnd) {
      x = fragment.rect.x;
      width = Math.max(visualEndX - fragment.rect.x, 2);
    }

    if (width <= 0) return null;

    return {
      x,
      y: line.y,
      width,
      height: line.height,
      pageId: pageId,
    };
  }
}

// @ts-nocheck




import { PositionCalculator } from "./PositionCalculator.js";




export class SelectionMapper {




  constructor(layout, measurer) {
    this.layout = layout;
    this.measurer = measurer;
    this.positionCalculator = new PositionCalculator(layout);
  }

  getCaretRect(position) {
    if (!position) return null;

    const blockFragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!blockFragments) return null;

    const fragment =
      blockFragments.find(
        (f) =>
          position.offset >= f.startOffset && position.offset <= f.endOffset,
      ) || blockFragments[blockFragments.length - 1];

    if (!fragment) return null;

    const y = this.positionCalculator.calculateYPosition(position);
    const xOffset = this.positionCalculator.calculateXOffset(
      position,
      fragment,
      this.measurer,
    );

    const lineHeight = fragment.typography.fontSize * 1.2;

    return {
      x: fragment.rect.x + xOffset,
      y: y,
      height: lineHeight,
      pageId: fragment.pageId,
    };
  }

  getSelectionRects(range) {
    const startRect = this.getCaretRect(range.start);
    const endRect = this.getCaretRect(range.end);

    if (!startRect || !endRect) return [];

    if (startRect.pageId === endRect.pageId) {
      const startY = startRect.y;
      const endY = endRect.y;
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      const height = maxY - minY + startRect.height;

      return [
        {
          x: startRect.x,
          y: minY,
          width: Math.abs(endRect.x - startRect.x) || 1,
          height: height,
          pageId: startRect.pageId,
        },
      ];
    }

    return [];
  }
}
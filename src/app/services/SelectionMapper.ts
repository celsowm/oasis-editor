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
    const { start, end } = range;
    
    // First, try to get exact caret rects.
    const startRect = this.getCaretRect(start);
    const endRect = this.getCaretRect(end);

    if (!startRect || !endRect) return [];

    let visualStart = null;
    let visualEnd = null;
    
    // Pre-determine visual start and end by traversing
    for (const page of this.layout.pages) {
      for (const fragment of page.fragments) {
         if (fragment.blockId === start.blockId && fragment.blockId === end.blockId) {
             visualStart = start.offset <= end.offset ? start : end;
             visualEnd = start.offset <= end.offset ? end : start;
             break;
         }
         if (fragment.blockId === start.blockId && !visualStart) {
             visualStart = start;
             visualEnd = end;
             break;
         }
         if (fragment.blockId === end.blockId && !visualStart) {
             visualStart = end;
             visualEnd = start;
             break;
         }
      }
      if (visualStart) break;
    }

    if (!visualStart || !visualEnd) return [];
    
    const vStartRect = visualStart === start ? startRect : endRect;
    const vEndRect = visualEnd === end ? endRect : startRect;

    const rects = [];
    let inSelection = false;
    let done = false;

    for (const page of this.layout.pages) {
      for (const fragment of page.fragments) {
        if (!fragment.lines) continue;

        for (const line of fragment.lines) {
          let lineMatchesStart = false;
          let lineMatchesEnd = false;

          // Check if visualStart is in this line
          if (!inSelection && fragment.blockId === visualStart.blockId &&
              visualStart.offset >= line.offsetStart && visualStart.offset <= line.offsetEnd) {
             inSelection = true;
             lineMatchesStart = true;
          }

          // Check if visualEnd is in this line
          if (inSelection && fragment.blockId === visualEnd.blockId &&
              visualEnd.offset >= line.offsetStart && visualEnd.offset <= line.offsetEnd) {
             lineMatchesEnd = true;
             done = true;
          }

          if (inSelection) {
             let x = fragment.rect.x;
             let width = line.width || fragment.rect.width;

             if (lineMatchesStart && lineMatchesEnd) {
                x = vStartRect.x;
                width = Math.max(vEndRect.x - vStartRect.x, 2);
             } else if (lineMatchesStart) {
                x = vStartRect.x;
                width = Math.max((fragment.rect.x + (line.width || fragment.rect.width)) - vStartRect.x, 2);
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

    return rects;
  }
}
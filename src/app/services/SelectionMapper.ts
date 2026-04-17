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

    // Convert run-relative offset to block-absolute for fragment lookup
    const absOffset = this.positionCalculator.getAbsoluteOffsetInBlock(position, blockFragments[0]);

    const fragment =
      blockFragments.find(
        (f) =>
          absOffset >= f.startOffset && absOffset <= f.endOffset,
      ) || blockFragments[blockFragments.length - 1];

    if (!fragment) return null;

    const y = this.positionCalculator.calculateYPosition(position);
    const xOffset = this.positionCalculator.calculateXOffset(
      position,
      fragment,
      this.measurer,
    );

    const lineHeight = fragment.lines?.[0]?.height || fragment.typography.fontSize * 1.5;

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

    // Convert run-relative offsets to block-absolute for correct comparisons
    const startFragments = this.layout.fragmentsByBlockId[start.blockId];
    const endFragments = this.layout.fragmentsByBlockId[end.blockId];
    const absStartOffset = this.positionCalculator.getAbsoluteOffsetInBlock(start, startFragments?.[0]);
    const absEndOffset = this.positionCalculator.getAbsoluteOffsetInBlock(end, endFragments?.[0]);

    let visualStart = null;
    let visualEnd = null;
    let visualStartAbs = 0;
    let visualEndAbs = 0;
    
    // Pre-determine visual start and end by traversing
    for (const page of this.layout.pages) {
      for (const fragment of page.fragments) {
         if (fragment.blockId === start.blockId && fragment.blockId === end.blockId) {
             if (absStartOffset <= absEndOffset) {
               visualStart = start; visualEnd = end;
               visualStartAbs = absStartOffset; visualEndAbs = absEndOffset;
             } else {
               visualStart = end; visualEnd = start;
               visualStartAbs = absEndOffset; visualEndAbs = absStartOffset;
             }
             break;
         }
         if (fragment.blockId === start.blockId && !visualStart) {
             visualStart = start; visualEnd = end;
             visualStartAbs = absStartOffset; visualEndAbs = absEndOffset;
             break;
         }
         if (fragment.blockId === end.blockId && !visualStart) {
             visualStart = end; visualEnd = start;
             visualStartAbs = absEndOffset; visualEndAbs = absStartOffset;
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

          // Check if visualStart is in this line (use absolute offsets)
          if (!inSelection && fragment.blockId === visualStart.blockId &&
              visualStartAbs >= line.offsetStart && visualStartAbs <= line.offsetEnd) {
             inSelection = true;
             lineMatchesStart = true;
          }

          // Check if visualEnd is in this line (use absolute offsets)
          if (inSelection && fragment.blockId === visualEnd.blockId &&
              visualEndAbs >= line.offsetStart && visualEndAbs <= line.offsetEnd) {
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
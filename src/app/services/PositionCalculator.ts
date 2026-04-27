import { LogicalPosition } from "../../core/selection/SelectionTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { LayoutFragment, LineInfo } from "../../core/layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { TextRun } from "../../core/document/BlockTypes.js";
import {
  measureLineWidthUpToOffset,
  calculateJustificationExtraSpace,
} from "./JustifiedLineMeasurer.js";

export class PositionCalculator {
  private layout: LayoutState;

  constructor(layout: LayoutState) {
    this.layout = layout;
  }

  /**
   * Converts a logical position to a block-relative offset.
   */
  getOffsetInBlock(position: LogicalPosition): number {
    const fragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!fragments || fragments.length === 0) return position.offset;

    for (const fragment of fragments) {
      let offsetInFragment = 0;
      for (const run of fragment.runs) {
        if (run.id === position.inlineId) {
          return fragment.startOffset + offsetInFragment + position.offset;
        }
        offsetInFragment += run.text.length;
      }
    }

    return position.offset;
  }

  getFragmentContainingPosition(
    position: LogicalPosition,
  ): LayoutFragment | null {
    const fragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!fragments || fragments.length === 0) return null;

    const absoluteOffset = this.getOffsetInBlock(position);

    return (
      fragments.find(
        (f) => absoluteOffset >= f.startOffset && absoluteOffset <= f.endOffset,
      ) ?? fragments[0]
    );
  }

  private findTargetLine(
    fragment: LayoutFragment,
    offsetInBlock: number,
  ): LineInfo | null {
    if (!fragment.lines || fragment.lines.length === 0) return null;

    for (const line of fragment.lines) {
      if (
        offsetInBlock >= line.offsetStart &&
        offsetInBlock <= line.offsetEnd
      ) {
        return line;
      }
    }

    return fragment.lines[fragment.lines.length - 1];
  }

  calculateYPosition(position: LogicalPosition): number | null {
    const fragment = this.getFragmentContainingPosition(position);
    if (!fragment) return null;

    if (!fragment.lines || fragment.lines.length === 0) {
      return fragment.rect.y;
    }

    const absoluteOffset = this.getOffsetInBlock(position);
    const offsetInBlock = absoluteOffset - fragment.startOffset;

    const targetLine = this.findTargetLine(fragment, offsetInBlock);
    return targetLine?.y ?? fragment.rect.y;
  }

  calculateXOffset(
    position: LogicalPosition,
    fragment: LayoutFragment | null,
    measurer: TextMeasurer,
  ): number {
    if (!fragment || !measurer) return 0;

    const absoluteOffset = this.getOffsetInBlock(position);
    const offsetInBlock = absoluteOffset - fragment.startOffset;

    const targetLine = this.findTargetLine(fragment, offsetInBlock);
    const lineStartOffset = targetLine ? targetLine.offsetStart : 0;
    const offsetInLine = Math.max(0, offsetInBlock - lineStartOffset);

    const indent = fragment.indentation ?? 0;
    let totalWidth = (targetLine?.x ?? 0) + indent;
    if (offsetInLine === 0) return totalWidth;

    const targetOffset = lineStartOffset + offsetInLine;
    totalWidth += measureLineWidthUpToOffset(
      fragment,
      targetLine ?? {
        id: "",
        text: fragment.text,
        width: fragment.rect.width,
        height: 0,
        x: 0,
        y: 0,
        offsetStart: 0,
        offsetEnd: fragment.text.length,
      },
      targetOffset,
      measurer,
    );

    // measureLineWidthUpToOffset includes line.x in its calculation,
    // but we already added it above (plus indent). Remove the double-count.
    totalWidth -= targetLine?.x ?? 0;

    return totalWidth;
  }
}

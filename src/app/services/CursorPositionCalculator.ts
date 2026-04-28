import { LogicalPosition } from "../../core/selection/SelectionTypes.js";
import { LineInfo, LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { TextMeasurementService } from "./TextMeasurementService.js";
import { isTextBlock, BlockNode } from "../../core/document/BlockTypes.js";
import { getAllBlocks } from "../../core/document/BlockUtils.js";
import { DomHitTester } from "./DomHitTester.js";
import { Logger } from "../../core/utils/Logger.js";

export class CursorPositionCalculator {
  constructor(
    private measurementService: TextMeasurementService,
    private getLatestLayout: () => LayoutState | null,
    private getDocumentBlocks: () => BlockNode[],
    private domHitTester: DomHitTester,
  ) {}

  calculateFromMouseEvent(event: MouseEvent): LogicalPosition | null {
    Logger.debug("CURSOR: calculateFromMouseEvent:start", {
      x: event.clientX,
      y: event.clientY,
      buttons: event.buttons,
      target: (event.target as HTMLElement | null)?.className ?? null,
    });

    const element = this.domHitTester.elementFromPoint(event.clientX, event.clientY);
    Logger.debug("CURSOR: elementFromPoint", {
      element: element
        ? {
            tag: element.tagName,
            id: (element as HTMLElement).id ?? null,
            className: (element as HTMLElement).className ?? null,
            text: (element as HTMLElement).textContent?.slice(0, 80) ?? null,
          }
        : null,
    });

    const target = element
      ? (this.domHitTester.closest(".oasis-fragment", element) as HTMLElement | null)
      : null;

    if (!target) {
      Logger.debug("CURSOR: no fragment target", {
        x: event.clientX,
        y: event.clientY,
      });
      return null;
    }

    const fragmentId = target.getAttribute("data-fragment-id") ?? "";
    const blockId = target.getAttribute("data-block-id") ?? "";
    const fragmentText = target.textContent ?? "";
    const rect = target.getBoundingClientRect();

    Logger.debug("CURSOR: fragment target", {
      fragmentId,
      blockId,
      kind: target.className,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      textLength: fragmentText.length,
    });

    const clickXInFragment = event.clientX - rect.left;
    const clickYInFragment = event.clientY - rect.top;

    const layoutFragments =
      this.getLatestLayout()?.fragmentsByBlockId[blockId] ?? [];
    const layoutFragment =
      layoutFragments.find((f) => f.id === fragmentId) ?? layoutFragments[0];

    if (!layoutFragment) {
      Logger.debug("CURSOR: no layoutFragment", {
        fragmentId,
        blockId,
        availableFragments: layoutFragments.map((f) => f.id),
      });
      return null;
    }

    Logger.debug("CURSOR: layoutFragment", {
      id: layoutFragment.id,
      blockId: layoutFragment.blockId,
      kind: layoutFragment.kind,
      pageId: layoutFragment.pageId,
      lineCount: layoutFragment.lines?.length ?? 0,
    });

    const page = this.getLatestLayout()?.pages.find((p) => p.id === layoutFragment.pageId);
    const sectionId = page?.sectionId ?? "section:0";

    const targetLine = this.findTargetLine(layoutFragment, clickYInFragment);
    Logger.debug("CURSOR: targetLine", targetLine
      ? {
          id: targetLine.id,
          y: targetLine.y,
          height: targetLine.height,
          offsetStart: targetLine.offsetStart,
          offsetEnd: targetLine.offsetEnd,
          text: targetLine.text.slice(0, 80),
        }
      : null);

    let closestOffset = 0;
    let minDistance = Infinity;

    if (targetLine) {
      const lineStart = targetLine.offsetStart;
      const lineEnd = targetLine.offsetEnd;
      for (let i = lineStart; i <= lineEnd; i++) {
        const measuredWidth = this.measurementService.measureWidthUpToOffset(
          layoutFragment,
          targetLine,
          i,
        );
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    } else {
      for (let i = 0; i <= fragmentText.length; i++) {
        const fallbackLine: LineInfo = {
          id: "", text: fragmentText, width: layoutFragment.rect.width,
          height: 0, x: 0, y: 0, offsetStart: 0, offsetEnd: fragmentText.length,
        };
        const measuredWidth = this.measurementService.measureWidthUpToOffset(
          layoutFragment, fallbackLine, i,
        );
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    }

    const block = this.getDocumentBlocks().find((b) => b.id === blockId);
    if (!block) return null;

    let actualRunId = fragmentId;
    let relativeOffset = closestOffset;

    if (isTextBlock(block)) {
      let currentOffset = 0;
      for (const run of block.children) {
        const runLength = run.text.length;
        if (
          closestOffset >= currentOffset &&
          closestOffset <= currentOffset + runLength
        ) {
          actualRunId = run.id;
          relativeOffset = closestOffset - currentOffset;
          break;
        }
        currentOffset += runLength;
      }
    }

    const result = { sectionId, blockId, inlineId: actualRunId, offset: relativeOffset };
    Logger.debug("CURSOR: result", {
      result,
      closestOffset,
      clickXInFragment,
      clickYInFragment,
    });
    return result;
  }

  private findTargetLine(layoutFragment: LayoutFragment, clickYInFragment: number): LineInfo | null {
    if (!layoutFragment.lines?.length) return null;

    let targetLine: LineInfo = layoutFragment.lines[0];
    for (const line of layoutFragment.lines) {
      const relativeLineY = line.y - layoutFragment.rect.y;
      if (
        clickYInFragment >= relativeLineY &&
        clickYInFragment < relativeLineY + line.height
      ) {
        return line;
      }
    }

    const lastLine = layoutFragment.lines[layoutFragment.lines.length - 1];
    const unrelativeLastLineY = lastLine.y - layoutFragment.rect.y;
    if (clickYInFragment >= unrelativeLastLineY) {
      return lastLine;
    }
    return layoutFragment.lines[0];
  }
}

import { BlockBehavior, BlockMeasurementResult } from "../BlockBehavior.js";
import { BlockNode, isTextBlock } from "../BlockTypes.js";
import { ParagraphComposer } from "../../composition/ParagraphComposer.js";
import { TextMeasurer } from "../../../bridge/measurement/TextMeasurementBridge.js";
import { IFontManager } from "../../typography/FontManager.js";
import { SectionNode } from "../SectionTypes.js";
import { LineInfo, LayoutFragment } from "../../layout/LayoutFragment.js";
import { TextRun } from "../BlockTypes.js";

function sliceRunsForRange(runs: TextRun[], startOffset: number, endOffset: number): TextRun[] {
  const lineRuns: TextRun[] = [];
  let currentOffset = 0;

  for (const run of runs) {
    const runStart = currentOffset;
    const runEnd = currentOffset + run.text.length;
    currentOffset = runEnd;

    if (runEnd <= startOffset || runStart >= endOffset) {
      continue;
    }

    const sliceStart = Math.max(0, startOffset - runStart);
    const sliceEnd = Math.min(run.text.length, endOffset - runStart);
    const text = run.text.slice(sliceStart, sliceEnd);
    if (!text) continue;

    lineRuns.push({
      ...run,
      text,
    });
  }

  return lineRuns;
}

export class ParagraphBehavior implements BlockBehavior {
  measure(
    block: BlockNode,
    width: number,
    measure: TextMeasurer,
    section: SectionNode,
    fontManager: IFontManager,
    currentY: number
  ): BlockMeasurementResult {
    if (!isTextBlock(block)) {
        return { height: 0, fragments: [] };
    }

    const composer = new ParagraphComposer(measure, fontManager);
    const result = composer.compose(block, width, section);
    const absoluteLines: LineInfo[] = result.lines.map((line) => ({
      ...line,
      y: currentY + line.y,
      runs: sliceRunsForRange(block.children, line.offsetStart, line.offsetEnd),
      typography: result.typography,
    }));

    const fragment: LayoutFragment = {
      id: `${block.id}_fragment`,
      blockId: block.id,
      sectionId: section.id,
      pageId: "",
      fragmentIndex: 0,
      kind: block.kind,
      startOffset: 0,
      endOffset: result.text.length,
      text: result.text,
      rect: {
        x: 0,
        y: currentY,
        width,
        height: result.totalHeight,
      },
      typography: result.typography,
      marks: {},
      runs: block.children,
      lines: absoluteLines,
      align: block.align || "left",
      indentation: result.indentation,
      listNumber: result.listNumber,
      listFormat: result.listFormat,
      listLevel: result.listLevel,
    };

    return {
      height: result.totalHeight,
      fragments: [fragment],
    };
  }
}

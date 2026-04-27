import { BlockBehavior, BlockMeasurementResult } from "../BlockBehavior.js";
import { BlockNode, isTextBlock } from "../BlockTypes.js";
import { ParagraphComposer } from "../../composition/ParagraphComposer.js";
import { TextMeasurer } from "../../../bridge/measurement/TextMeasurementBridge.js";
import { IFontManager } from "../../typography/FontManager.js";
import { SectionNode } from "../SectionTypes.js";

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

    // Map composer lines to layout fragments
    const fragments = result.lines.map((line, index) => ({
      id: `${block.id}_L${index}`,
      blockId: block.id,
      kind: block.kind,
      text: line.text,
      rect: {
        x: line.x,
        y: currentY + line.y,
        width: line.width,
        height: line.height,
      },
      typography: line.typography,
      align: block.align || "left",
      lines: result.lines,
      runs: line.runs,
    }));

    return {
      height: result.height,
      fragments: fragments as any,
    };
  }
}

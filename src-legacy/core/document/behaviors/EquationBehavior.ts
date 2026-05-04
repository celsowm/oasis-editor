import { BlockBehavior, BlockMeasurementResult } from "../BlockBehavior.js";
import { BlockNode, EquationNode } from "../BlockTypes.js";
import { TextMeasurer } from "../../../bridge/measurement/TextMeasurementBridge.js";
import { IFontManager } from "../../typography/FontManager.js";
import { SectionNode } from "../SectionTypes.js";
import { LayoutFragment } from "../../layout/LayoutFragment.js";

export class EquationBehavior implements BlockBehavior {
  measure(
    block: BlockNode,
    width: number,
    _measure: TextMeasurer,
    section: SectionNode,
    fontManager: IFontManager,
    currentY: number
  ): BlockMeasurementResult {
    const eqBlock = block as EquationNode;
    const typography = fontManager.getTypographyForBlock("math");
    const lineHeight = Math.round(typography.fontSize * typography.lineHeight);
    const display = eqBlock.display ?? false;
    const height = display ? lineHeight * 2 : lineHeight;

    const fragment: LayoutFragment = {
      id: `fragment:${block.id}:0`,
      blockId: block.id,
      sectionId: section.id,
      pageId: "",
      fragmentIndex: 0,
      kind: "equation",
      startOffset: 0,
      endOffset: eqBlock.latex.length,
      text: eqBlock.latex,
      rect: { x: 0, y: currentY, width, height },
      typography,
      runs: [],
      marks: {},
      lines: [],
      align: display ? "center" : "left",
      equationLatex: eqBlock.latex,
      equationDisplay: display,
    };

    return { height, fragments: [fragment] };
  }
}

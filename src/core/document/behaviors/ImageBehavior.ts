import { BlockBehavior, BlockMeasurementResult } from "../BlockBehavior.js";
import { BlockNode, ImageNode } from "../BlockTypes.js";
import { TextMeasurer } from "../../../bridge/measurement/TextMeasurementBridge.js";
import { IFontManager } from "../../typography/FontManager.js";
import { SectionNode } from "../SectionTypes.js";
import { LayoutFragment } from "../../layout/LayoutFragment.js";

export class ImageBehavior implements BlockBehavior {
  measure(
    block: BlockNode,
    width: number,
    _measure: TextMeasurer,
    section: SectionNode,
    fontManager: IFontManager,
    currentY: number
  ): BlockMeasurementResult {
    const imgBlock = block as ImageNode;
    const imgW = Math.min(imgBlock.width, width);
    const scale = imgW / imgBlock.width;
    const imgH = Math.round(imgBlock.height * scale);

    const fragment: LayoutFragment = {
      id: `fragment:${block.id}:0`,
      blockId: block.id,
      sectionId: section.id,
      pageId: "",
      fragmentIndex: 0,
      kind: "image",
      startOffset: 0,
      endOffset: 0,
      text: "",
      rect: { x: 0, y: currentY, width: imgW, height: imgH },
      typography: { ...fontManager.getTypographyForBlock("image"), fontFamily: "" },
      runs: [],
      marks: {},
      lines: [],
      align: imgBlock.align,
      imageSrc: imgBlock.src,
      imageAlt: imgBlock.alt ?? "",
    };

    return { height: imgH, fragments: [fragment] };
  }
}

import { LayoutFragment } from "../layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { BlockNode, ImageNode } from "../document/BlockTypes.js";
import { composeParagraph } from "../composition/ParagraphComposer.js";
import { SectionNode } from "../document/SectionTypes.js";

export interface MeasuredBlockResult {
  height: number;
  fragments: LayoutFragment[];
}

export function measureTextBlocks(
  blocks: BlockNode[],
  width: number,
  measure: TextMeasurer,
  section: SectionNode,
): MeasuredBlockResult {
  let localY = 0;
  const fragments: LayoutFragment[] = [];

  for (const block of blocks) {
    if (block.kind === "image") {
      const imgResult = measureImageBlock(block, width, section);
      fragments.push(imgResult.fragment);
      localY += imgResult.height + 12;
    } else if (
      block.kind === "paragraph" ||
      block.kind === "heading" ||
      block.kind === "list-item" ||
      block.kind === "ordered-list-item"
    ) {
      const composed = composeParagraph(block, width, measure);
      const textLength = block.children
        .map((child) => child.text)
        .join("").length;
      fragments.push({
        id: `fragment:${block.id}:0`,
        blockId: block.id,
        sectionId: section.id,
        pageId: "",
        fragmentIndex: 0,
        kind: block.kind,
        startOffset: 0,
        endOffset: textLength,
        text: composed.text,
        rect: { x: 0, y: localY, width: width, height: composed.totalHeight },
        typography: composed.typography,
        runs: composed.runs,
        marks: {},
        lines: composed.lines.map((l) => ({ ...l, y: l.y + localY })),
        align: composed.align,
        indentation: composed.indentation,
        listNumber: composed.listNumber,
      });
      localY += composed.totalHeight + 12;
    }
  }

  return { height: localY, fragments };
}

export function measureImageBlock(
  block: ImageNode,
  width: number,
  section: SectionNode,
): { fragment: LayoutFragment; height: number } {
  const imgW = Math.min(block.width, width);
  const scale = imgW / block.width;
  const imgH = Math.round(block.height * scale);

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
    rect: { x: 0, y: 0, width: imgW, height: imgH },
    typography: { fontFamily: "", fontSize: 0, fontWeight: 400 },
    runs: [],
    marks: {},
    lines: [],
    align: block.align,
    imageSrc: block.src,
    imageAlt: block.alt ?? "",
  };

  return { fragment, height: imgH };
}

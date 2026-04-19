import { BlockNode, TextRun } from "../document/BlockTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { LineInfo } from "../layout/LayoutFragment.js";
import { breakTextIntoLines } from "./LineBreaker.js";

export interface BlockTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
}

export interface ComposedParagraph {
  blockId: string;
  kind: string;
  text: string;
  runs: TextRun[];
  typography: BlockTypography;
  totalHeight: number;
  lines: LineInfo[];
  align: "left" | "center" | "right" | "justify";
}

const getBlockTypography = (block: BlockNode): BlockTypography => {
  const firstRun = block.children[0];
  const fontFamily = firstRun?.marks.fontFamily ?? "Inter";
  const fontSize =
    firstRun?.marks.fontSize ?? (block.kind === "heading" ? 24 : 15);
  const fontWeight =
    firstRun?.marks.bold || block.kind === "heading" ? 700 : 400;

  return { fontFamily, fontSize, fontWeight };
};

export const composeParagraph = (
  block: BlockNode,
  maxWidth: number,
  measure: TextMeasurer,
): ComposedParagraph => {
  const plainText = block.children.reduce((acc, child) => acc + child.text, "");
  const typography = getBlockTypography(block);

  const broken = breakTextIntoLines(
    block.children,
    maxWidth,
    measure,
    typography.fontFamily,
    typography.fontSize,
    block.kind === "heading",
  );

  if (broken.length === 0) {
    broken.push({ text: "", width: 0 });
  }

  const lineHeight =
    typography.fontSize * (block.kind === "heading" ? 1.35 : 1.5);

  let currentOffset = 0;
  const lines: LineInfo[] = broken.map((line, index) => {
    let x = 0;
    if (block.align === "center") {
      x = (maxWidth - line.width) / 2;
    } else if (block.align === "right") {
      x = maxWidth - line.width;
    }

    const lineInfo: LineInfo = {
      id: `${block.id}:line:${index}`,
      text: line.text,
      width: line.width,
      height: lineHeight,
      x,
      y: index * lineHeight,
      offsetStart: currentOffset,
      offsetEnd: currentOffset + line.text.length,
    };
    currentOffset += line.text.length;
    return lineInfo;
  });

  return {
    blockId: block.id,
    kind: block.kind,
    text: plainText,
    runs: block.children,
    typography,
    totalHeight: broken.length * lineHeight,
    lines,
    align: block.align,
  };
};

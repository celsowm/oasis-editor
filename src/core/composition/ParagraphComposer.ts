// @ts-nocheck








import { breakTextIntoLines } from "./LineBreaker.js";

const getBlockTypography = (block) => {
  const firstRun = block.children[0];
  const fontFamily = firstRun?.marks.fontFamily ?? "Arial";
  const fontSize =
    firstRun?.marks.fontSize ?? (block.kind === "heading" ? 24 : 15);
  const fontWeight =
    firstRun?.marks.bold || block.kind === "heading" ? 700 : 400;

  return { fontFamily, fontSize, fontWeight };
};

export const composeParagraph = (block, maxWidth, measure) => {
  const plainText = block.children.map((child) => child.text).join("");
  const typography = getBlockTypography(block);
  const broken = breakTextIntoLines(
    plainText,
    maxWidth,
    measure,
    typography.fontFamily,
    typography.fontSize,
  );

  const lineHeight =
    typography.fontSize * (block.kind === "heading" ? 1.35 : 1.5);

  let currentOffset = 0;
  const lines = broken.map((line, index) => {
    const lineInfo = {
      id: `${block.id}:line:${index}`,
      text: line.text,
      width: line.width,
      height: lineHeight,
      offsetStart: currentOffset,
      offsetEnd: currentOffset + line.text.length,
      y: index * lineHeight,
    };
    currentOffset += line.text.length + 1;
    return lineInfo;
  });

  return {
    blockId: block.id,
    kind: block.kind,
    text: plainText,
    typography,
    totalHeight: broken.length * lineHeight,
    lines,
  };
};

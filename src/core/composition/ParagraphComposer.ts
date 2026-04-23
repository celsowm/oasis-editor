import { BlockNode, TextRun, isTextBlock, ListItemNode, OrderedListItemNode } from "../document/BlockTypes.js";
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
  listIndentation?: number;
  listNumber?: number;
}

const getBlockTypography = (block: BlockNode): BlockTypography => {
  const children = isTextBlock(block) ? block.children : [];
  const firstRun = children[0];
  const fontFamily = firstRun?.marks.fontFamily ?? "Inter";
  const fontSize =
    firstRun?.marks.fontSize ?? (block.kind === "heading" ? 24 : 15);
  const fontWeight =
    firstRun?.marks.bold || block.kind === "heading" ? 700 : 400;

  return { fontFamily, fontSize, fontWeight };
};

export const DEFAULT_LIST_INDENTATION = 25;
export const DEFAULT_ORDERED_LIST_INDENTATION = 30;

export const composeParagraph = (
  block: BlockNode,
  maxWidth: number,
  measure: TextMeasurer,
): ComposedParagraph => {
  const children = isTextBlock(block) ? block.children : [];
  const plainText = children.map((child) => child.text).join("");
  const typography = getBlockTypography(block);

  const isListItem = block.kind === "list-item";
  const isOrderedListItem = block.kind === "ordered-list-item";
  
  const listIndentation = isTextBlock(block)
    ? (block.indentation ?? (isListItem ? DEFAULT_LIST_INDENTATION : isOrderedListItem ? DEFAULT_ORDERED_LIST_INDENTATION : 0))
    : 0;
    
  const adjustedMaxWidth = maxWidth - listIndentation;

  const broken = breakTextIntoLines(
    children,
    adjustedMaxWidth,
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
  const align = isTextBlock(block) ? block.align : "left";
  const lines: LineInfo[] = broken.map((line, index) => {
    let x = 0;
    if (align === "center") {
      x += (adjustedMaxWidth - line.width) / 2;
    } else if (align === "right") {
      x += adjustedMaxWidth - line.width;
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
    runs: children,
    typography,
    totalHeight: broken.length * lineHeight,
    lines,
    align,
    listIndentation: listIndentation > 0 ? listIndentation : undefined,
    listNumber: isOrderedListItem ? (block as OrderedListItemNode).index : undefined,
  };
};

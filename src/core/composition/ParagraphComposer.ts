import {
  BlockNode,
  TextRun,
  isTextBlock,
  ListItemNode,
  OrderedListItemNode,
} from "../document/BlockTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { LineInfo } from "../layout/LayoutFragment.js";
import { breakTextIntoLines } from "./LineBreaker.js";
import type { IFontManager, BlockTypography } from "../typography/FontManager.js";

export type { BlockTypography };

export interface ComposedParagraph {
  blockId: string;
  kind: string;
  text: string;
  runs: TextRun[];
  typography: BlockTypography;
  totalHeight: number;
  lines: LineInfo[];
  align: "left" | "center" | "right" | "justify";
  indentation?: number;
  listNumber?: number;
  listFormat?: import("../document/BlockTypes.js").ListFormat;
  listLevel?: number;
}

const getBlockTypography = (block: BlockNode, fontManager: IFontManager): BlockTypography => {
  const children = isTextBlock(block) ? block.children : [];
  const firstRun = children[0];
  const defaults = fontManager.getTypographyForBlock(block.kind);
  
  const fontFamily = fontManager.resolveFontFamily(firstRun?.marks.fontFamily ?? defaults.fontFamily);
  const fontSize = firstRun?.marks.fontSize ?? defaults.fontSize;
  const fontWeight = firstRun?.marks.bold ? 700 : defaults.fontWeight;

  return { fontFamily, fontSize, fontWeight, lineHeight: defaults.lineHeight };
};

export const DEFAULT_LIST_INDENTATION = 25;
export const DEFAULT_ORDERED_LIST_INDENTATION = 30;

export const composeParagraph = (
  block: BlockNode,
  maxWidth: number,
  measure: TextMeasurer,
  fontManager: IFontManager,
): ComposedParagraph => {
  const children = isTextBlock(block) ? block.children : [];
  const plainText = children.map((child) => child.text).join("");
  const typography = getBlockTypography(block, fontManager);

  const isListItem = block.kind === "list-item";
  const isOrderedListItem = block.kind === "ordered-list-item";

  const indentation = isTextBlock(block)
    ? (block.indentation ??
      (isListItem
        ? DEFAULT_LIST_INDENTATION
        : isOrderedListItem
          ? DEFAULT_ORDERED_LIST_INDENTATION
          : 0))
    : 0;

  const adjustedMaxWidth = maxWidth - indentation;

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

  const lineHeight = typography.fontSize * typography.lineHeight;

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

  const listFormat =
    isListItem || isOrderedListItem
      ? (block as ListItemNode | OrderedListItemNode).listFormat ??
        (isOrderedListItem ? "decimal" : "bullet")
      : undefined;

  const listLevel =
    isListItem || isOrderedListItem
      ? (block as ListItemNode | OrderedListItemNode).level ?? 0
      : undefined;

  return {
    blockId: block.id,
    kind: block.kind,
    text: plainText,
    runs: children,
    typography,
    totalHeight: broken.length * lineHeight,
    lines,
    align,
    indentation: indentation,
    listNumber: isOrderedListItem
      ? (block as OrderedListItemNode).index
      : undefined,
    listFormat,
    listLevel,
  };
};

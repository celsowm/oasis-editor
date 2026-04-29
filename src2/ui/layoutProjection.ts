import type {
  Editor2BlockNode,
  Editor2CaretSlot,
  Editor2LayoutBlock,
  Editor2LayoutDocument,
  Editor2LayoutFragment,
  Editor2LayoutFragmentChar,
  Editor2LayoutLine,
  Editor2LayoutParagraph,
  Editor2ParagraphNode,
  Editor2TableNode,
} from "../core/model.js";
import { getParagraphText } from "../core/model.js";
import { measureLinesFromRects, type CharRect } from "./caretGeometry.js";

const DEFAULT_FONT_SIZE = 20;
const DEFAULT_LINE_HEIGHT = 1.6;
const DEFAULT_PAGE_HEIGHT = 920;
const DEFAULT_PARAGRAPH_GAP = 10;

function sliceFragmentToRange(
  fragment: Editor2LayoutFragment,
  startOffset: number,
  endOffset: number,
): Editor2LayoutFragment | null {
  const start = Math.max(startOffset, fragment.startOffset);
  const end = Math.min(endOffset, fragment.endOffset);
  if (start >= end) {
    return null;
  }

  const chars = fragment.chars.filter(
    (char) => char.paragraphOffset >= start && char.paragraphOffset < end,
  );

  return {
    paragraphId: fragment.paragraphId,
    runId: fragment.runId,
    startOffset: start,
    endOffset: end,
    text: chars.map((char) => char.char).join(""),
    styles: fragment.styles ? { ...fragment.styles } : undefined,
    image: fragment.image ? { ...fragment.image } : undefined,
    chars,
  };
}

export function projectParagraphLayout(paragraph: Editor2ParagraphNode): Editor2LayoutParagraph {
  let paragraphOffset = 0;
  const fragments: Editor2LayoutFragment[] = paragraph.runs.map((run) => {
    const chars: Editor2LayoutFragmentChar[] = Array.from(run.text).map((char, index) => ({
      char,
      paragraphOffset: paragraphOffset + index,
      runOffset: index,
    }));

    const fragment: Editor2LayoutFragment = {
      paragraphId: paragraph.id,
      runId: run.id,
      startOffset: paragraphOffset,
      endOffset: paragraphOffset + run.text.length,
      text: run.text,
      styles: run.styles ? { ...run.styles } : undefined,
      image: run.image ? { ...run.image } : undefined,
      chars,
    };

    paragraphOffset += run.text.length;
    return fragment;
  });

  const lines: Editor2LayoutLine[] = [
    {
      paragraphId: paragraph.id,
      index: 0,
      startOffset: 0,
      endOffset: paragraphOffset,
      top: 0,
      height: 28,
      slots: Array.from({ length: paragraphOffset + 1 }, (_, offset) => ({
        paragraphId: paragraph.id,
        offset,
        left: 0,
        top: 0,
        height: 28,
      })),
      fragments,
    },
  ];

  return {
    paragraphId: paragraph.id,
    text: getParagraphText(paragraph),
    fragments,
    lines,
  };
}

export function measureParagraphLayoutFromRects(
  paragraph: Editor2ParagraphNode,
  charRects: CharRect[],
): Editor2LayoutParagraph {
  const projected = projectParagraphLayout(paragraph);
  const measuredLines = measureLinesFromRects(charRects);

  return {
    ...projected,
    lines: measuredLines.map((line) => {
      const slots: Editor2CaretSlot[] = line.slots.map((slot) => ({
        paragraphId: paragraph.id,
        offset: slot.offset,
        left: slot.left,
        top: slot.top,
        height: slot.height,
      }));

      return {
        paragraphId: paragraph.id,
        index: line.index,
        startOffset: line.startOffset,
        endOffset: line.endOffset,
        top: line.top,
        height: line.height,
        slots,
        fragments: projected.fragments
          .map((fragment) => sliceFragmentToRange(fragment, line.startOffset, line.endOffset))
          .filter((fragment): fragment is Editor2LayoutFragment => fragment !== null),
      };
    }),
  };
}

export function resolveClosestOffsetInMeasuredLayout(
  layout: Editor2LayoutParagraph,
  clientX: number,
  clientY: number,
): number {
  const slots = layout.lines.flatMap((line) => line.slots);
  if (slots.length === 0) {
    return 0;
  }

  let bestOffset = slots[0]!.offset;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const slot of slots) {
    const verticalDelta =
      clientY < slot.top ? slot.top - clientY : clientY > slot.top + slot.height ? clientY - (slot.top + slot.height) : 0;
    const horizontalDelta = Math.abs(clientX - slot.left);
    const score = verticalDelta * 1000 + horizontalDelta;

    if (score < bestScore) {
      bestScore = score;
      bestOffset = slot.offset;
    }
  }

  return bestOffset;
}

function estimateParagraphFontSize(paragraph: Editor2ParagraphNode): number {
  const runFontSizes = paragraph.runs
    .map((run) => run.styles?.fontSize)
    .filter((fontSize): fontSize is number => typeof fontSize === "number" && Number.isFinite(fontSize));

  return runFontSizes.length > 0 ? Math.max(...runFontSizes) : DEFAULT_FONT_SIZE;
}

function estimateParagraphLineHeight(paragraph: Editor2ParagraphNode, fontSize: number): number {
  return (paragraph.style?.lineHeight ?? DEFAULT_LINE_HEIGHT) * fontSize;
}

function estimateCharsPerLine(paragraph: Editor2ParagraphNode): number {
  const indentPenalty = Math.floor((paragraph.style?.indentLeft ?? 0) / 16);
  const firstLinePenalty = Math.floor(Math.abs(paragraph.style?.indentFirstLine ?? 0) / 16);
  const listPenalty = paragraph.list ? 4 : 0;
  return Math.max(12, 48 - indentPenalty - firstLinePenalty - listPenalty);
}

export function estimateParagraphBlockHeight(paragraph: Editor2ParagraphNode): number {
  const textLength = Math.max(1, getParagraphText(paragraph).length);
  const fontSize = estimateParagraphFontSize(paragraph);
  const lineHeightPx = estimateParagraphLineHeight(paragraph, fontSize);
  const charsPerLine = estimateCharsPerLine(paragraph);
  const lineCount = Math.max(1, Math.ceil(textLength / charsPerLine));
  const spacingBefore = paragraph.style?.spacingBefore ?? 0;
  const spacingAfter = paragraph.style?.spacingAfter ?? 0;

  return spacingBefore + spacingAfter + lineCount * lineHeightPx + DEFAULT_PARAGRAPH_GAP;
}

export function estimateTableBlockHeight(table: Editor2TableNode): number {
  const rowHeights = table.rows.map((row) => {
    const cellHeights = row.cells.map((cell) =>
      cell.blocks.reduce((sum, paragraph) => sum + estimateParagraphBlockHeight(paragraph), 0),
    );
    return Math.max(...cellHeights, DEFAULT_FONT_SIZE * DEFAULT_LINE_HEIGHT) + 12;
  });

  return rowHeights.reduce((sum, height) => sum + height, 0) + 16;
}

export function projectDocumentLayout(
  blocks: Editor2BlockNode[],
  maxPageHeight = DEFAULT_PAGE_HEIGHT,
  measuredHeights?: Record<string, number>,
): Editor2LayoutDocument {
  const projectedBlocks: Editor2LayoutBlock[] = blocks.map((block, globalIndex) =>
    block.type === "paragraph"
      ? {
          blockId: block.id,
          blockType: block.type,
          paragraphId: block.id,
          globalIndex,
          estimatedHeight: measuredHeights?.[block.id] ?? estimateParagraphBlockHeight(block),
          layout: projectParagraphLayout(block),
          sourceBlock: block,
        }
      : {
          blockId: block.id,
          blockType: block.type,
          globalIndex,
          estimatedHeight: measuredHeights?.[block.id] ?? estimateTableBlockHeight(block),
          sourceBlock: block,
        },
  );

  const pages: Editor2LayoutDocument["pages"] = [];
  let currentBlocks: Editor2LayoutBlock[] = [];
  let currentHeight = 0;

  const flushPage = () => {
    if (currentBlocks.length === 0) {
      return;
    }

    pages.push({
      id: `page:${pages.length + 1}`,
      index: pages.length,
      height: currentHeight,
      maxHeight: maxPageHeight,
      blocks: currentBlocks,
    });
    currentBlocks = [];
    currentHeight = 0;
  };

  for (let index = 0; index < projectedBlocks.length; index += 1) {
    const block = projectedBlocks[index]!;
    const nextBlock = projectedBlocks[index + 1];
    const sourceBlock = blocks[index]!;
    const keepWithNext =
      sourceBlock.type === "paragraph" &&
      sourceBlock.style?.keepWithNext === true &&
      nextBlock !== undefined;
    const keepPairHeight = keepWithNext
      ? block.estimatedHeight + nextBlock.estimatedHeight
      : block.estimatedHeight;

    if (sourceBlock.type === "paragraph" && sourceBlock.style?.pageBreakBefore && currentBlocks.length > 0) {
      flushPage();
    }

    if (currentBlocks.length > 0 && currentHeight + keepPairHeight > maxPageHeight) {
      flushPage();
    }

    currentBlocks.push(block);
    currentHeight += block.estimatedHeight;
  }

  flushPage();

  if (pages.length === 0) {
    pages.push({
      id: "page:1",
      index: 0,
      height: 0,
      maxHeight: maxPageHeight,
      blocks: [],
    });
  }

  return {
    maxPageHeight,
    pages,
  };
}

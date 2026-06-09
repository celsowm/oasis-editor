import type {
  EditorLayoutLine,
  EditorNamedStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "../../core/model.js";
import { DEFAULT_FONT_SIZE } from "./constants.js";
import type {
  MeasuredChar,
  MeasuredToken,
  TextMeasureOptions,
} from "./types.js";
import {
  buildMeasuredChars,
  buildParagraphFragments,
  tokenizeMeasuredChars,
} from "./tokenizer.js";
import { getAvailableWidth, getLineStartInset } from "./indentation.js";
import { getParagraphLineHeight } from "./paragraphLineHeight.js";
import { resolveTabAdvancePx } from "./tabStops.js";
import { commitLine } from "./layoutLine.js";
import { applyParagraphAlignment } from "./alignment.js";

const DEFAULT_CONTENT_WIDTH = 624;
const MIN_CONTENT_WIDTH = 120;

export function measureParagraphMinContentWidthPx(
  paragraph: EditorParagraphNode,
  styles?: Record<string, EditorNamedStyle>,
): number {
  const fragments = buildParagraphFragments(paragraph);
  const measuredChars = buildMeasuredChars(paragraph, fragments, styles);
  const tokens = tokenizeMeasuredChars(measuredChars);
  const firstLineInset = Math.max(
    0,
    getLineStartInset(paragraph, styles, true),
  );
  const otherLineInset = Math.max(
    0,
    getLineStartInset(paragraph, styles, false),
  );
  const inset = Math.max(firstLineInset, otherLineInset);
  const largestUnbreakableToken = tokens.reduce((largest, token) => {
    if (token.kind !== "text") return largest;
    return Math.max(largest, token.width);
  }, 0);
  const largestInlineObject = paragraph.runs.reduce((largest, run) => {
    const imageWidth = run.image && !run.image.floating ? run.image.width : 0;
    const textBoxWidth =
      run.textBox && !run.textBox.floating ? run.textBox.width : 0;

    return Math.max(largest, imageWidth, textBoxWidth);
  }, 0);

  return Math.max(1, inset + largestUnbreakableToken, largestInlineObject);
}

export function composeMeasuredParagraphLines(
  options: TextMeasureOptions,
): EditorLayoutLine[] {
  const { paragraph, fragments, styles, contentWidth, defaultTabStop } =
    options;
  const measuredChars = buildMeasuredChars(paragraph, fragments, styles);
  const tokens = tokenizeMeasuredChars(measuredChars);
  const charByOffset = new Map<number, string>(
    measuredChars.map((char) => [char.offset, char.char] as const),
  );
  const fallbackFontSize = Math.max(
    DEFAULT_FONT_SIZE,
    ...paragraph.runs.map(
      (run) =>
        resolveEffectiveTextStyleForParagraph(
          run.styles,
          paragraph.style?.styleId,
          styles,
        ).fontSize ?? DEFAULT_FONT_SIZE,
    ),
  );
  const lineHeight = getParagraphLineHeight(
    paragraph,
    styles,
    fallbackFontSize,
  );
  const width =
    contentWidth === undefined
      ? Math.max(MIN_CONTENT_WIDTH, DEFAULT_CONTENT_WIDTH)
      : Math.max(1, contentWidth);

  if (tokens.length === 0) {
    const firstLineInset = getLineStartInset(paragraph, styles, true);
    return [
      {
        paragraphId: paragraph.id,
        index: 0,
        startOffset: 0,
        endOffset: 0,
        top: 0,
        height: lineHeight,
        slots: [
          {
            paragraphId: paragraph.id,
            offset: 0,
            left: firstLineInset,
            top: 0,
            height: lineHeight,
          },
        ],
        fragments: [],
      },
    ];
  }

  const lines: EditorLayoutLine[] = [];
  const lineHardBreaks: boolean[] = [];
  let lineStartOffset =
    tokens[0]!.kind === "newline"
      ? tokens[0]!.chars[0]!.offset + 1
      : tokens[0]!.chars[0]!.offset;
  let lineWidth = 0;
  let lineStartInset = getLineStartInset(paragraph, styles, true);
  let lineSlotLefts = [lineStartInset];
  let lineEndOffset = lineStartOffset;
  let top = 0;
  let isFirstLine = true;

  const flushLine = (hardBreak = false) => {
    commitLine(
      lines,
      paragraph.id,
      lineStartOffset,
      lineEndOffset,
      lineSlotLefts,
      top,
      lineHeight,
    );
    lineHardBreaks.push(hardBreak);
    top += lineHeight;
    isFirstLine = false;
  };

  const resetLine = (nextOffset: number) => {
    lineStartOffset = nextOffset;
    lineEndOffset = nextOffset;
    lineWidth = 0;
    lineStartInset = getLineStartInset(paragraph, styles, isFirstLine);
    lineSlotLefts = [lineStartInset];
  };

  const measureCharsAt = (
    chars: MeasuredChar[],
    startLineWidth: number,
  ): number => {
    let widthAt = startLineWidth;
    for (const char of chars) {
      widthAt +=
        char.char === "\t"
          ? resolveTabAdvancePx(
              paragraph,
              styles,
              defaultTabStop,
              lineStartInset,
              widthAt,
              char.offset,
              measuredChars,
            )
          : char.width;
    }
    return widthAt - startLineWidth;
  };

  const measureTokenAt = (token: MeasuredToken): number =>
    token.chars.some((char) => char.char === "\t")
      ? measureCharsAt(token.chars, lineWidth)
      : token.width;

  const appendChars = (chars: MeasuredChar[]) => {
    for (const char of chars) {
      lineWidth +=
        char.char === "\t"
          ? resolveTabAdvancePx(
              paragraph,
              styles,
              defaultTabStop,
              lineStartInset,
              lineWidth,
              char.offset,
              measuredChars,
            )
          : char.width;
      lineEndOffset = char.offset + 1;
      lineSlotLefts.push(lineStartInset + lineWidth);
    }
  };

  for (const token of tokens) {
    if (token.kind === "newline") {
      flushLine(true);
      resetLine(token.chars[0]!.offset + 1);
      continue;
    }

    const availableWidth = getAvailableWidth(
      paragraph,
      styles,
      width,
      isFirstLine,
    );
    const tokenWidth = measureTokenAt(token);
    const fitsCurrentLine = lineWidth + tokenWidth <= availableWidth;
    const isEmptyLine = lineStartOffset === lineEndOffset;

    if (token.kind === "whitespace") {
      // Greedy: whitespace fits or line is empty → place it; otherwise flush
      if (fitsCurrentLine || isEmptyLine) {
        appendChars(token.chars);
      } else {
        flushLine();
        resetLine(token.chars[token.chars.length - 1]!.offset + 1);
      }
      continue;
    }

    if (fitsCurrentLine) {
      appendChars(token.chars);
      continue;
    }

    flushLine();
    resetLine(token.chars[0]!.offset);

    let nextLineWidth = getAvailableWidth(
      paragraph,
      styles,
      width,
      isFirstLine,
    );
    let currentChunk: MeasuredChar[] = [];
    let currentChunkWidth = 0;

    for (const char of token.chars) {
      const charWidth =
        char.char === "\t"
          ? resolveTabAdvancePx(
              paragraph,
              styles,
              defaultTabStop,
              lineStartInset,
              currentChunkWidth,
              char.offset,
              measuredChars,
            )
          : char.width;
      if (
        currentChunk.length > 0 &&
        currentChunkWidth + charWidth > nextLineWidth
      ) {
        appendChars(currentChunk);
        flushLine();
        resetLine(char.offset);
        nextLineWidth = getAvailableWidth(
          paragraph,
          styles,
          width,
          isFirstLine,
        );
        currentChunk = [];
        currentChunkWidth = 0;
      }

      currentChunk.push(char);
      currentChunkWidth += charWidth;
    }

    if (currentChunk.length > 0) {
      appendChars(currentChunk);
    }
  }

  if (
    lines.length === 0 ||
    lineStartOffset !== lineEndOffset ||
    lineSlotLefts.length > 1
  ) {
    flushLine();
  }

  return applyParagraphAlignment(
    paragraph,
    styles,
    width,
    lines,
    lineHardBreaks,
    charByOffset,
  );
}

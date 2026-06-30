import type {
  EditorLayoutLine,
  EditorNamedStyle,
  EditorParagraphNode,
} from "@/core/model.js";
import {
  getRunImage,
  getRunTextBox,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { PX_PER_POINT } from "@/core/units.js";
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
import { getLineStartInset } from "./indentation.js";
import { resolveLineFlowBox, type LineFlowBox } from "./lineFlow.js";
import { getParagraphLineHeight } from "./paragraphLineHeight.js";
import { resolveTabAdvancePx } from "./tabStops.js";
import { commitLine } from "./layoutLine.js";
import { applyParagraphAlignment } from "./alignment.js";
import { measureCharacterWidth } from "./characterWidth.js";
import {
  findHyphenationPoints,
  resolveHyphenationLanguage,
  shouldHyphenateWord,
} from "./hyphenation.js";

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
  const largestUnbreakableToken = tokens.reduce((largest, token): number => {
    if (token.kind !== "text") return largest;
    return Math.max(largest, token.width);
  }, 0);
  const largestInlineObject = paragraph.runs.reduce((largest, run): number => {
    const image = getRunImage(run);
    const textBox = getRunTextBox(run);
    const imageWidth = image && !image.floating ? image.width : 0;
    const textBoxWidth = textBox && !textBox.floating ? textBox.width : 0;

    return Math.max(largest, imageWidth, textBoxWidth);
  }, 0);

  return Math.max(1, inset + largestUnbreakableToken, largestInlineObject);
}

export function composeMeasuredParagraphLines(
  options: TextMeasureOptions,
): EditorLayoutLine[] {
  const { paragraph, fragments, styles, contentWidth, defaultTabStop } =
    options;
  const exclusions = options.exclusions ?? [];
  // `w:suppressAutoHyphens`: a paragraph may opt out of document-wide
  // auto-hyphenation. Resolved here (not at the caller) so every composer entry
  // point — measure, project, min-width — stays in sync.
  const effectiveParagraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const hyphenation = effectiveParagraphStyle.suppressAutoHyphens
    ? undefined
    : options.hyphenation;
  const measuredChars = buildMeasuredChars(paragraph, fragments, styles);
  const tokens = tokenizeMeasuredChars(measuredChars);
  const charByOffset = new Map<number, string>(
    measuredChars.map(
      (char): readonly [number, string] => [char.offset, char.char] as const,
    ),
  );
  const fallbackFontSize = Math.max(
    DEFAULT_FONT_SIZE,
    ...paragraph.runs.map(
      (run): number =>
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
    const emptyLine: EditorLayoutLine = {
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
    };

    if (exclusions.length > 0) {
      const flow = resolveLineFlowBox({
        paragraph,
        styles,
        contentWidth: width,
        isFirstLine: true,
        lineTop: 0,
        lineHeight,
        exclusions,
      });
      if (flow.forcedTop !== undefined && flow.forcedTop > 0) {
        emptyLine.top = flow.forcedTop;
        emptyLine.slots[0]!.left = flow.left;
        emptyLine.slots[0]!.top = flow.forcedTop;
      } else {
        emptyLine.slots[0]!.left = flow.left;
      }
      emptyLine.availableWidth = flow.width;
    }

    return [emptyLine];
  }

  const lines: EditorLayoutLine[] = [];
  const lineHardBreaks: boolean[] = [];
  let lineStartOffset =
    tokens[0]!.kind === "newline"
      ? tokens[0]!.chars[0]!.offset + 1
      : tokens[0]!.chars[0]!.offset;
  let lineWidth = 0;
  let lineEndOffset = lineStartOffset;
  let lineMaxObjectHeight = 0;
  let top = 0;
  let isFirstLine = true;

  const computeFlow = (): LineFlowBox =>
    resolveLineFlowBox({
      paragraph,
      styles,
      contentWidth: width,
      isFirstLine,
      lineTop: top,
      lineHeight,
      exclusions,
    });

  // A visual "band" at vertical position `top` may expose several writable
  // segments (gaps) when wrapping is "through". We fill the leftmost gap first,
  // then jump to the next gap on the SAME band before advancing `top`.
  let currentFlow = computeFlow();
  let segmentIndex = 0;
  let bandHeight = 0;
  let lineStartInset = currentFlow.segments[0]!.left;
  let lineAvailableWidth = currentFlow.segments[0]!.width;
  let lineSlotLefts = [lineStartInset];

  const applySegment = (nextOffset: number): void => {
    lineStartOffset = nextOffset;
    lineEndOffset = nextOffset;
    lineWidth = 0;
    lineMaxObjectHeight = 0;
    const segment =
      currentFlow.segments[segmentIndex] ?? currentFlow.segments[0]!;
    lineStartInset = segment.left;
    lineAvailableWidth = segment.width;
    lineSlotLefts = [lineStartInset];
  };

  // Count of consecutive lines ending with an automatic hyphen, for
  // `w:consecutiveHyphenLimit`. A plain (non-hyphen) flush resets it.
  let consecutiveHyphens = 0;

  // Commit the current segment as a layout line. Does not advance `top`; that
  // happens once per band in `advanceRegion`. When `trailingHyphenWidth` is set
  // the line was broken mid-word: mark it so renderers draw a trailing hyphen.
  const flushLine = (hardBreak = false, trailingHyphenWidth?: number): void => {
    // An inline image/text box grows the line so it does not overlap adjacent
    // lines; normal text lines keep their font-derived height.
    const effectiveHeight = Math.max(lineHeight, lineMaxObjectHeight);
    commitLine(
      lines,
      paragraph.id,
      lineStartOffset,
      lineEndOffset,
      lineSlotLefts,
      top,
      effectiveHeight,
      lineAvailableWidth,
    );
    if (trailingHyphenWidth !== undefined) {
      const committed = lines[lines.length - 1]!;
      committed.trailingHyphen = true;
      committed.trailingHyphenWidth = trailingHyphenWidth;
      consecutiveHyphens += 1;
    } else {
      consecutiveHyphens = 0;
    }
    lineHardBreaks.push(hardBreak);
    bandHeight = Math.max(bandHeight, effectiveHeight);
  };

  // Move to the next writable region after a wrap. A soft wrap first tries the
  // next gap on the current band (same `top`); a hard break, or an exhausted
  // band, advances `top` to a fresh band and recomputes its segments.
  const resetLine = (nextOffset: number, softWrap = true): void => {
    if (softWrap && segmentIndex + 1 < currentFlow.segments.length) {
      segmentIndex += 1;
      applySegment(nextOffset);
      return;
    }
    top += bandHeight > 0 ? bandHeight : lineHeight;
    bandHeight = 0;
    segmentIndex = 0;
    isFirstLine = false;
    currentFlow = computeFlow();
    applySegment(nextOffset);
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
    token.chars.some((char): boolean => char.char === "\t")
      ? measureCharsAt(token.chars, lineWidth)
      : token.width;

  const appendChars = (chars: MeasuredChar[]): void => {
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
      if (char.objectHeight !== undefined) {
        lineMaxObjectHeight = Math.max(lineMaxObjectHeight, char.objectHeight);
      }
      lineEndOffset = char.offset + 1;
      lineSlotLefts.push(lineStartInset + lineWidth);
    }
  };

  // Lay a word's characters onto the current line, breaking between characters
  // only when an individual chunk would overflow. Last-resort fallback for words
  // with no usable hyphenation point.
  const layoutByChars = (chars: MeasuredChar[]): void => {
    let currentChunk: MeasuredChar[] = [];
    let currentChunkWidth = 0;
    for (const char of chars) {
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
        currentChunkWidth + charWidth > lineAvailableWidth
      ) {
        appendChars(currentChunk);
        flushLine();
        resetLine(char.offset);
        currentChunk = [];
        currentChunkWidth = 0;
      }
      currentChunk.push(char);
      currentChunkWidth += charWidth;
    }
    if (currentChunk.length > 0) {
      appendChars(currentChunk);
    }
  };

  const hyphenLimit = hyphenation?.consecutiveLimit ?? 0;
  const canHyphenateMore = (): boolean =>
    hyphenLimit <= 0 || consecutiveHyphens < hyphenLimit;

  // How many leading chars of `chars` to keep on the current line (with a
  // trailing hyphen) plus the hyphen advance, or null when the word cannot be
  // hyphenated to fit `remainingWidth`.
  const tryHyphenate = (
    chars: MeasuredChar[],
    remainingWidth: number,
  ): { breakIndex: number; hyphenWidth: number } | null => {
    if (!hyphenation?.enabled || !canHyphenateMore()) return null;
    const word = chars.map((char): string => char.char).join("");
    if (
      !shouldHyphenateWord(word, {
        doNotHyphenateCaps: hyphenation.doNotHyphenateCaps,
      })
    ) {
      return null;
    }
    const langTag = chars.find(
      (char): string | null | undefined => char.style?.language?.value,
    )?.style?.language?.value;
    const points = findHyphenationPoints(
      word,
      resolveHyphenationLanguage(langTag ?? undefined),
    );
    if (points.length === 0) return null;
    const hyphenWidth = measureCharacterWidth(
      "-",
      chars[0]?.style,
      fallbackFontSize,
    );
    let prefixWidth = 0;
    let scanned = 0;
    let chosen = -1;
    for (const point of points) {
      while (scanned < point) {
        prefixWidth += chars[scanned]!.width;
        scanned += 1;
      }
      if (prefixWidth + hyphenWidth <= remainingWidth) {
        chosen = point;
      } else {
        break;
      }
    }
    return chosen > 0 ? { breakIndex: chosen, hyphenWidth } : null;
  };

  // Place a word that begins a fresh line. Fits whole when possible; otherwise
  // hyphenates an oversized word and recurses on the remainder; falls back to
  // character breaking only when nothing else fits.
  const layoutFreshWord = (chars: MeasuredChar[]): void => {
    if (measureCharsAt(chars, 0) <= lineAvailableWidth) {
      appendChars(chars);
      return;
    }
    const hy = tryHyphenate(chars, lineAvailableWidth);
    if (hy) {
      appendChars(chars.slice(0, hy.breakIndex));
      flushLine(false, hy.hyphenWidth);
      resetLine(chars[hy.breakIndex]!.offset);
      layoutFreshWord(chars.slice(hy.breakIndex));
      return;
    }
    layoutByChars(chars);
  };

  for (const token of tokens) {
    if (token.kind === "newline") {
      flushLine(true);
      resetLine(token.chars[0]!.offset + 1, false);
      continue;
    }

    const tokenWidth = measureTokenAt(token);
    const fitsCurrentLine = lineWidth + tokenWidth <= lineAvailableWidth;
    const isEmptyLine = lineStartOffset === lineEndOffset;

    if (token.kind === "whitespace") {
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

    // Word does not fit the remaining space. Prefer an automatic hyphen onto the
    // current line (only when the trailing gap exceeds the hyphenation zone),
    // otherwise wrap the whole word to a fresh line.
    if (!isEmptyLine) {
      const remaining = lineAvailableWidth - lineWidth;
      const zonePx = (hyphenation?.zone ?? 0) * PX_PER_POINT;
      if (remaining > zonePx) {
        const hy = tryHyphenate(token.chars, remaining);
        if (hy) {
          appendChars(token.chars.slice(0, hy.breakIndex));
          flushLine(false, hy.hyphenWidth);
          resetLine(token.chars[hy.breakIndex]!.offset);
          layoutFreshWord(token.chars.slice(hy.breakIndex));
          continue;
        }
      }
    }

    flushLine();
    resetLine(token.chars[0]!.offset);
    layoutFreshWord(token.chars);
  }

  // A paragraph ending with a hard line break (trailing `<w:br/>`) reserves an
  // empty final line in Word. The newline branch leaves an empty working line,
  // so flush it here to match Word's paragraph/header height.
  const endsWithTrailingLineBreak =
    tokens[tokens.length - 1]?.kind === "newline";

  if (
    lines.length === 0 ||
    lineStartOffset !== lineEndOffset ||
    lineSlotLefts.length > 1 ||
    endsWithTrailingLineBreak
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

import type {
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTextStyle,
} from "../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../core/model.js";

const DEFAULT_FONT_SIZE = 14.6667; // 11pt
const DEFAULT_LINE_HEIGHT = 1.15;
const DEFAULT_CONTENT_WIDTH = 624;
const DEFAULT_LIST_GUTTER = 24;
// Extra horizontal indent added per nested list level, matching the
// 0.25 inch "Define New Multilevel List" default step Word applies for the
// built-in numbering gallery.
const LIST_LEVEL_INDENT_STEP = 24;

function getListIndentPx(paragraph: EditorParagraphNode): number {
  if (!paragraph.list) return 0;
  const level = paragraph.list.level ?? 0;
  return DEFAULT_LIST_GUTTER + level * LIST_LEVEL_INDENT_STEP;
}
const MIN_CONTENT_WIDTH = 120;
const TAB_SIZE = 4;
const DEFAULT_WORD_SINGLE_LINE_RATIO = 1.223;
const FAST_IMPLICIT_DOC_GRID_RATIO = 0.86;
const PX_PER_POINT = 96 / 72;

// Calibração para paridade com MS Word
// O Word usa DirectWrite/GDI que tem métricas ligeiramente diferentes do Canvas 2D
// Fator calibrado comparando medições de Canvas 2D vs Word para fontes comuns
const WORD_CALIBRATION_FACTOR = 1.0; // Desativado temporariamente: causava quebra prematura de palavras na borda (ex: "neque.")
const CALIBRATED_FONTS = new Set([
  "calibri",
  "times new roman",
  "arial",
  "cambria",
  "courier new",
  "georgia",
  "verdana",
]);
const WORD_COMPAT_SHORT_TOKEN_OVERFLOW_PX = 0; // Removido para impedir que o texto atravesse a margem direita quebrando a justificação
const WORD_COMPAT_SHORT_TOKEN_MIN_CHARS = 4;
const WORD_COMPAT_SHORT_TOKEN_MAX_CHARS = 6;

interface MeasuredChar {
  char: string;
  offset: number;
  width: number;
}

interface MeasuredToken {
  kind: "text" | "whitespace" | "newline";
  chars: MeasuredChar[];
  width: number;
}

export interface TextMeasureOptions {
  paragraph: EditorParagraphNode;
  fragments: EditorLayoutFragment[];
  styles?: Record<string, EditorNamedStyle>;
  contentWidth?: number;
  layoutMode?: "fast" | "wordParity";
}

// ... existing code down to composeMeasuredParagraphLines

const textMeasureCache = new Map<string, number>();

let sharedCanvasContext: CanvasRenderingContext2D | null | undefined;

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (sharedCanvasContext !== undefined) {
    return sharedCanvasContext;
  }

  if (typeof document === "undefined") {
    sharedCanvasContext = null;
    return sharedCanvasContext;
  }

  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    sharedCanvasContext = null;
    return sharedCanvasContext;
  }

  const canvas = document.createElement("canvas");
  try {
    sharedCanvasContext = canvas.getContext("2d");
  } catch {
    sharedCanvasContext = null;
  }
  return sharedCanvasContext;
}

function getMeasuredFontSize(
  styles: EditorTextStyle | undefined,
  fallbackFontSize: number,
): number {
  const fontSize = styles?.fontSize ?? fallbackFontSize;
  return styles?.smallCaps ? fontSize * 0.8 : fontSize;
}

function getRenderedMeasureChar(
  char: string,
  styles: EditorTextStyle | undefined,
): string {
  return styles?.allCaps ? char.toUpperCase() : char;
}

function buildCanvasFont(
  styles: EditorTextStyle | undefined,
  fallbackFontSize: number,
): string {
  const fontSize = getMeasuredFontSize(styles, fallbackFontSize);
  const fontFamily = styles?.fontFamily ?? "Calibri, sans-serif";
  const fontWeight = styles?.bold ? "700" : "400";
  const fontStyle = styles?.italic ? "italic" : "normal";
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
}

const normalLineHeightCache = new Map<string, number>();

function measureNormalLineHeight(
  styles: EditorTextStyle | undefined,
  fallbackFontSize: number,
): number {
  const font = buildCanvasFont(styles, fallbackFontSize);
  const cached = normalLineHeightCache.get(font);
  if (cached !== undefined) {
    return cached;
  }

  const fontSize = getMeasuredFontSize(styles, fallbackFontSize);
  const minimumWordLineHeight = fontSize * DEFAULT_WORD_SINGLE_LINE_RATIO;
  const context = getCanvasContext();
  let measured = minimumWordLineHeight;
  if (context) {
    context.font = font;
    const metrics = context.measureText("Hg");
    const ascent =
      metrics.actualBoundingBoxAscent ?? metrics.fontBoundingBoxAscent ?? 0;
    const descent =
      metrics.actualBoundingBoxDescent ?? metrics.fontBoundingBoxDescent ?? 0;
    const canvasMeasured = ascent + descent;
    if (canvasMeasured > 0) {
      measured = canvasMeasured;
    }
  }
  const resolved = Math.max(measured, minimumWordLineHeight);
  normalLineHeightCache.set(font, resolved);
  return resolved;
}

export function resolveRenderedLineHeightPx(
  styles: EditorTextStyle | undefined,
  lineHeightMultiple: number,
): number {
  const fontSize = styles?.fontSize ?? DEFAULT_FONT_SIZE;
  const normalLineHeight = measureNormalLineHeight(styles, fontSize);
  return normalLineHeight * lineHeightMultiple;
}

function measureFallbackCharacterWidth(char: string, fontSize: number): number {
  if (char === " ") {
    return fontSize * 0.35;
  }
  if (char === "\t") {
    return fontSize * 0.35 * TAB_SIZE;
  }
  if (".,;:!'`|ilI".includes(char)) {
    return fontSize * 0.3;
  }
  if ("mwMW@#%&".includes(char)) {
    return fontSize * 0.92;
  }
  if ("0123456789".includes(char)) {
    return fontSize * 0.6;
  }
  if (/[A-Z]/.test(char)) {
    return fontSize * 0.72;
  }
  if (/[a-z]/.test(char)) {
    return fontSize * 0.62;
  }
  // Intentionally matches any non-Latin-1 character (control range included).
  // eslint-disable-next-line no-control-regex
  if (/[^\u0000-\u00ff]/.test(char)) {
    return fontSize;
  }
  return fontSize * 0.66;
}

function measureCharacterWidth(
  char: string,
  styles: EditorTextStyle | undefined,
  fallbackFontSize: number,
  layoutMode: "fast" | "wordParity",
): number {
  if (char === "\n") {
    return 0;
  }

  const fontSize = styles?.fontSize ?? fallbackFontSize;
  const font = buildCanvasFont(styles, fallbackFontSize);
  const renderedChar = getRenderedMeasureChar(char, styles);
  const scale =
    styles?.characterScale && styles.characterScale > 0
      ? styles.characterScale / 100
      : 1;
  const spacing = (styles?.characterSpacing ?? 0) * PX_PER_POINT;
  const cacheKey = `${font}|${renderedChar}|${scale}|${spacing}`;
  const cached = textMeasureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const context = getCanvasContext();
  let width: number;
  if (context) {
    context.font = font;
    const target = renderedChar === "\t" ? " ".repeat(TAB_SIZE) : renderedChar;
    width = context.measureText(target).width;
  } else {
    width = measureFallbackCharacterWidth(renderedChar, fontSize);
  }

  // Fast mode keeps calibrated width heuristics; wordParity mode uses raw canvas metrics.
  if (layoutMode !== "wordParity" && styles?.fontFamily) {
    const fontFamilyNormalized = styles.fontFamily
      .toLowerCase()
      .replace(/['"]/g, "")
      .split(",")[0]
      ?.trim();
    if (fontFamilyNormalized && CALIBRATED_FONTS.has(fontFamilyNormalized)) {
      width *= WORD_CALIBRATION_FACTOR;
    }
  }

  width = Math.max(0, width * scale + spacing);
  textMeasureCache.set(cacheKey, width);
  return width;
}

function tokenizeMeasuredChars(chars: MeasuredChar[]): MeasuredToken[] {
  const tokens: MeasuredToken[] = [];
  let current: MeasuredChar[] = [];
  let currentKind: MeasuredToken["kind"] | null = null;

  const flush = () => {
    if (current.length === 0 || !currentKind) {
      return;
    }

    tokens.push({
      kind: currentKind,
      chars: current,
      width: current.reduce((sum, char) => sum + char.width, 0),
    });
    current = [];
    currentKind = null;
  };

  for (const char of chars) {
    if (char.char === "\n") {
      flush();
      tokens.push({ kind: "newline", chars: [char], width: 0 });
      continue;
    }

    const nextKind: MeasuredToken["kind"] = /\s/.test(char.char)
      ? "whitespace"
      : "text";
    if (currentKind && currentKind !== nextKind) {
      flush();
    }
    currentKind = nextKind;
    current.push(char);
  }

  flush();
  return tokens;
}

function getParagraphLineHeight(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  fallbackFontSize: number,
  layoutMode: "fast" | "wordParity",
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const lineHeight = paragraphStyle.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const lineGridPitch = paragraphStyle.lineGridPitch;
  const snapToGrid = paragraphStyle.snapToGrid !== false;

  const paragraphTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );
  const maxRunHeight = paragraph.runs.reduce((largest, run) => {
    const runTextStyle = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      styles,
    );
    const fontSize =
      runTextStyle.fontSize ?? paragraphTextStyle.fontSize ?? fallbackFontSize;
    const baselineShiftPx =
      Math.abs(runTextStyle.baselineShift ?? 0) * PX_PER_POINT;
    const runLineHeight = resolveRenderedLineHeightPx(
      { ...runTextStyle, fontSize },
      lineHeight,
    );
    const imageHeight = run.image?.height ?? 0;
    return Math.max(largest, runLineHeight + baselineShiftPx, imageHeight);
  }, 0);

  const renderedLineHeight = Math.max(
    resolveRenderedLineHeightPx(
      {
        ...paragraphTextStyle,
        fontSize: paragraphTextStyle.fontSize ?? fallbackFontSize,
      },
      lineHeight,
    ),
    maxRunHeight,
  );

  if (lineGridPitch && lineGridPitch > 0 && snapToGrid) {
    if (paragraphStyle.lineGridType === "implicit") {
      const pitch =
        layoutMode === "wordParity"
          ? lineGridPitch
          : lineGridPitch * FAST_IMPLICIT_DOC_GRID_RATIO;
      return Math.max(renderedLineHeight, pitch);
    }
    return Math.ceil(renderedLineHeight / lineGridPitch) * lineGridPitch;
  }
  return renderedLineHeight;
}

function buildMeasuredChars(
  paragraph: EditorParagraphNode,
  fragments: EditorLayoutFragment[],
  styles: Record<string, EditorNamedStyle> | undefined,
  layoutMode: "fast" | "wordParity",
): MeasuredChar[] {
  const measured: MeasuredChar[] = [];
  const runsById = new Map(paragraph.runs.map((run) => [run.id, run] as const));
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

  for (const fragment of fragments) {
    const run = runsById.get(fragment.runId);
    const effectiveStyles = resolveEffectiveTextStyleForParagraph(
      run?.styles,
      paragraph.style?.styleId,
      styles,
    );

    for (const char of fragment.chars) {
      const width =
        char.char === "\uFFFC" && fragment.image
          ? fragment.image.width
          : measureCharacterWidth(
              char.char,
              effectiveStyles,
              fallbackFontSize,
              layoutMode,
            );
      measured.push({
        char: char.char,
        offset: char.paragraphOffset,
        width,
      });
    }
  }

  return measured;
}

function getAvailableWidth(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  contentWidth: number,
  isFirstLine: boolean,
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const listGutter = getListIndentPx(paragraph);

  // indentLeft specifies the start edge for all lines.
  const baseInset = (paragraphStyle.indentLeft ?? 0) + listGutter;

  // If first line, we add indentFirstLine. If indentHanging is present, it acts as a negative indentFirstLine.
  const firstLineOffset = paragraphStyle.indentHanging
    ? -Math.abs(paragraphStyle.indentHanging)
    : (paragraphStyle.indentFirstLine ?? 0);

  const startInset = baseInset + (isFirstLine ? firstLineOffset : 0);
  const rightInset = paragraphStyle.indentRight ?? 0;
  return Math.max(1, contentWidth - rightInset - startInset);
}

function getLineStartInset(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  isFirstLine: boolean,
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const listGutter = getListIndentPx(paragraph);

  const baseInset = (paragraphStyle.indentLeft ?? 0) + listGutter;
  const firstLineOffset = paragraphStyle.indentHanging
    ? -Math.abs(paragraphStyle.indentHanging)
    : (paragraphStyle.indentFirstLine ?? 0);

  return baseInset + (isFirstLine ? firstLineOffset : 0);
}

function buildSlots(
  startOffset: number,
  endOffset: number,
  lefts: number[],
  top: number,
  height: number,
) {
  return Array.from(
    { length: endOffset - startOffset + 1 },
    (_, slotIndex) => ({
      paragraphId: "",
      offset: startOffset + slotIndex,
      left: lefts[slotIndex] ?? lefts[lefts.length - 1] ?? 0,
      top,
      height,
    }),
  );
}

function commitLine(
  lines: EditorLayoutLine[],
  paragraphId: string,
  startOffset: number,
  endOffset: number,
  slotLefts: number[],
  top: number,
  height: number,
) {
  lines.push({
    paragraphId,
    index: lines.length,
    startOffset,
    endOffset,
    top,
    height,
    slots: buildSlots(startOffset, endOffset, slotLefts, top, height).map(
      (slot) => ({
        ...slot,
        paragraphId,
      }),
    ),
    fragments: [],
  });
}

function shiftLine(line: EditorLayoutLine, deltaX: number): EditorLayoutLine {
  if (Math.abs(deltaX) < 0.01) {
    return line;
  }
  return {
    ...line,
    slots: line.slots.map((slot) => ({
      ...slot,
      left: slot.left + deltaX,
    })),
  };
}

function getLineContentWidth(
  line: EditorLayoutLine,
  charByOffset: Map<number, string>,
): number {
  const firstSlot = line.slots[0];
  if (!firstSlot) {
    return 0;
  }

  let endSlotIndex = line.slots.length - 1;
  while (endSlotIndex > 0) {
    const slot = line.slots[endSlotIndex];
    if (!slot) break;
    const charIndex = slot.offset - 1;
    const char = charByOffset.get(charIndex);
    if (char === " " || char === "\t" || char === "\n") {
      endSlotIndex--;
    } else {
      break;
    }
  }

  const lastContentSlot = line.slots[endSlotIndex];
  if (!lastContentSlot) return 0;

  let width = Math.max(0, lastContentSlot.left - firstSlot.left);

  if (endSlotIndex > 0) {
    const charIndex = lastContentSlot.offset - 1;
    const char = charByOffset.get(charIndex);
    if (char && /^[.,;:?!'"\-)\]]$/.test(char)) {
      const prevSlot = line.slots[endSlotIndex - 1];
      if (prevSlot) {
        const charWidth = lastContentSlot.left - prevSlot.left;
        width -= charWidth * 0.5;
      }
    }
  }

  return width;
}

function justifyLineBySpaces(
  line: EditorLayoutLine,
  extraSpace: number,
  charByOffset: Map<number, string>,
): EditorLayoutLine {
  if (extraSpace <= 0 || line.endOffset <= line.startOffset) {
    return line;
  }

  let lastContentOffset = line.endOffset - 1;
  while (lastContentOffset >= line.startOffset) {
    const char = charByOffset.get(lastContentOffset);
    if (char && char !== " " && char !== "\t" && char !== "\n") {
      break;
    }
    lastContentOffset -= 1;
  }
  if (lastContentOffset < line.startOffset) {
    return line;
  }

  const spaceOffsets: number[] = [];
  for (
    let offset = line.startOffset;
    offset <= lastContentOffset;
    offset += 1
  ) {
    if (charByOffset.get(offset) === " ") {
      spaceOffsets.push(offset);
    }
  }
  if (spaceOffsets.length === 0) {
    return line;
  }

  const gap = extraSpace / spaceOffsets.length;
  let spaceIndex = 0;
  let shift = 0;
  return {
    ...line,
    slots: line.slots.map((slot) => {
      while (
        spaceIndex < spaceOffsets.length &&
        slot.offset > spaceOffsets[spaceIndex]!
      ) {
        shift += gap;
        spaceIndex += 1;
      }
      return {
        ...slot,
        left: slot.left + shift,
      };
    }),
  };
}

function applyParagraphAlignment(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  contentWidth: number,
  lines: EditorLayoutLine[],
  lineHardBreaks: boolean[],
  charByOffset: Map<number, string>,
): EditorLayoutLine[] {
  if (lines.length === 0) {
    return lines;
  }
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const align = paragraphStyle.align ?? "left";
  if (align === "left") {
    return lines;
  }

  return lines.map((line, lineIndex) => {
    const availableWidth = getAvailableWidth(
      paragraph,
      styles,
      contentWidth,
      lineIndex === 0,
    );
    const lineWidth = getLineContentWidth(line, charByOffset);
    const extraSpace = Math.max(0, availableWidth - lineWidth);
    if (extraSpace <= 0) {
      return line;
    }
    if (align === "center") {
      return shiftLine(line, extraSpace / 2);
    }
    if (align === "right") {
      return shiftLine(line, extraSpace);
    }
    const isLastLine = lineIndex === lines.length - 1;
    const endsWithHardBreak = lineHardBreaks[lineIndex] === true;
    if (align === "justify" && !isLastLine && !endsWithHardBreak) {
      return justifyLineBySpaces(line, extraSpace, charByOffset);
    }
    return line;
  });
}

function canApplyWordShortTokenFit(
  token: MeasuredToken,
  lineWidth: number,
  availableWidth: number,
  isEmptyLine: boolean,
): boolean {
  if (isEmptyLine || token.kind !== "text") {
    return false;
  }
  const text = token.chars.map((char) => char.char).join("");
  if (
    text.length < WORD_COMPAT_SHORT_TOKEN_MIN_CHARS ||
    text.length > WORD_COMPAT_SHORT_TOKEN_MAX_CHARS ||
    !/^[A-Za-z]+$/.test(text)
  ) {
    return false;
  }
  const overflow = lineWidth + token.width - availableWidth;
  return overflow > 0 && overflow <= WORD_COMPAT_SHORT_TOKEN_OVERFLOW_PX;
}

function buildParagraphFragments(
  paragraph: EditorParagraphNode,
): EditorLayoutFragment[] {
  let paragraphOffset = 0;
  return paragraph.runs.map((run) => {
    const chars = Array.from(run.text).map((char, index) => ({
      char,
      paragraphOffset: paragraphOffset + index,
      runOffset: index,
    }));
    const fragment: EditorLayoutFragment = {
      paragraphId: paragraph.id,
      runId: run.id,
      startOffset: paragraphOffset,
      endOffset: paragraphOffset + run.text.length,
      text: run.text,
      styles: run.styles ? { ...run.styles } : undefined,
      image: run.image ? { ...run.image } : undefined,
      revision: run.revision ? { ...run.revision } : undefined,
      chars,
    };
    paragraphOffset += run.text.length;
    return fragment;
  });
}

export function measureParagraphMinContentWidthPx(
  paragraph: EditorParagraphNode,
  styles?: Record<string, EditorNamedStyle>,
  layoutMode: "fast" | "wordParity" = "wordParity",
): number {
  const fragments = buildParagraphFragments(paragraph);
  const measuredChars = buildMeasuredChars(
    paragraph,
    fragments,
    styles,
    layoutMode,
  );
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
  const largestImage = paragraph.runs.reduce((largest, run) => {
    return Math.max(largest, run.image?.width ?? 0);
  }, 0);
  return Math.max(1, inset + largestUnbreakableToken, largestImage);
}

export function composeMeasuredParagraphLines(
  options: TextMeasureOptions,
): EditorLayoutLine[] {
  const {
    paragraph,
    fragments,
    styles,
    contentWidth,
    layoutMode = "fast",
  } = options;
  const measuredChars = buildMeasuredChars(
    paragraph,
    fragments,
    styles,
    layoutMode,
  );
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
    layoutMode,
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

  const appendChars = (chars: MeasuredChar[]) => {
    for (const char of chars) {
      lineWidth += char.width;
      lineEndOffset = char.offset + 1;
      lineSlotLefts.push(lineStartInset + lineWidth);
    }
  };

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]!;
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
    const fitsCurrentLine = lineWidth + token.width <= availableWidth;
    const isEmptyLine = lineStartOffset === lineEndOffset;
    if (
      fitsCurrentLine ||
      (isEmptyLine && token.kind === "whitespace") ||
      (layoutMode !== "wordParity" &&
        canApplyWordShortTokenFit(
          token,
          lineWidth,
          availableWidth,
          isEmptyLine,
        ))
    ) {
      appendChars(token.chars);
      continue;
    }

    if (token.kind === "whitespace") {
      flushLine();
      resetLine(token.chars[token.chars.length - 1]!.offset + 1);
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
      if (
        currentChunk.length > 0 &&
        currentChunkWidth + char.width > nextLineWidth
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
      currentChunkWidth += char.width;
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

import type { ITextMeasurer } from "../core/engine.js";

export const domTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines,
  resolveRenderedLineHeightPx,
};

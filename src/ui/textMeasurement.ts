import type {
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTextStyle,
} from "../core/model.js";
import { resolveEffectiveParagraphStyle, resolveEffectiveTextStyleForParagraph } from "../core/model.js";

const DEFAULT_FONT_SIZE = 15;
const DEFAULT_LINE_HEIGHT = 1.15;
const DEFAULT_CONTENT_WIDTH = 624;
const DEFAULT_LIST_GUTTER = 24;
const MIN_CONTENT_WIDTH = 120;
const TAB_SIZE = 4;
const DEFAULT_WORD_SINGLE_LINE_RATIO = 1.223;

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

interface TextMeasureOptions {
  paragraph: EditorParagraphNode;
  fragments: EditorLayoutFragment[];
  styles?: Record<string, EditorNamedStyle>;
  contentWidth?: number;
}

const textMeasureCache = new Map<string, number>();

let sharedCanvasContext: CanvasRenderingContext2D | null | undefined;
let sharedLineHeightProbe: HTMLSpanElement | null | undefined;

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

function buildCanvasFont(styles: EditorTextStyle | undefined, fallbackFontSize: number): string {
  const fontSize = styles?.fontSize ?? fallbackFontSize;
  const fontFamily = styles?.fontFamily ?? "Calibri, sans-serif";
  const fontWeight = styles?.bold ? "700" : "400";
  const fontStyle = styles?.italic ? "italic" : "normal";
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
}

function getLineHeightProbe(): HTMLSpanElement | null {
  if (sharedLineHeightProbe !== undefined) {
    return sharedLineHeightProbe;
  }

  if (typeof document === "undefined" || !document.body) {
    sharedLineHeightProbe = null;
    return sharedLineHeightProbe;
  }

  const probe = document.createElement("span");
  probe.textContent = "Hg";
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.whiteSpace = "pre";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  document.body.appendChild(probe);
  sharedLineHeightProbe = probe;
  return sharedLineHeightProbe;
}

const normalLineHeightCache = new Map<string, number>();

function measureNormalLineHeight(styles: EditorTextStyle | undefined, fallbackFontSize: number): number {
  const font = buildCanvasFont(styles, fallbackFontSize);
  const cached = normalLineHeightCache.get(font);
  if (cached !== undefined) {
    return cached;
  }

  const fontSize = styles?.fontSize ?? fallbackFontSize;
  const minimumWordLineHeight = fontSize * DEFAULT_WORD_SINGLE_LINE_RATIO;
  const probe = getLineHeightProbe();
  if (!probe) {
    normalLineHeightCache.set(font, minimumWordLineHeight);
    return minimumWordLineHeight;
  }

  probe.style.font = font;
  probe.style.lineHeight = "normal";
  const measured = probe.getBoundingClientRect().height || minimumWordLineHeight;
  const resolved = Math.max(measured, minimumWordLineHeight);
  normalLineHeightCache.set(font, resolved);
  return resolved;
}

export function resolveRenderedLineHeightPx(styles: EditorTextStyle | undefined, lineHeightMultiple: number): number {
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
  if (/[^\u0000-\u00ff]/.test(char)) {
    return fontSize;
  }
  return fontSize * 0.66;
}

function measureCharacterWidth(char: string, styles: EditorTextStyle | undefined, fallbackFontSize: number): number {
  if (char === "\n") {
    return 0;
  }

  const fontSize = styles?.fontSize ?? fallbackFontSize;
  const font = buildCanvasFont(styles, fallbackFontSize);
  const cacheKey = `${font}|${char}`;
  const cached = textMeasureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const context = getCanvasContext();
  let width: number;
  if (context) {
    context.font = font;
    const target = char === "\t" ? " ".repeat(TAB_SIZE) : char;
    width = context.measureText(target).width;
  } else {
    width = measureFallbackCharacterWidth(char, fontSize);
  }

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

    const nextKind: MeasuredToken["kind"] = /\s/.test(char.char) ? "whitespace" : "text";
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
): number {
  const lineHeight = resolveEffectiveParagraphStyle(paragraph.style, styles).lineHeight ?? DEFAULT_LINE_HEIGHT;
  const effectiveTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );
  return resolveRenderedLineHeightPx(
    {
      ...effectiveTextStyle,
      fontSize: effectiveTextStyle.fontSize ?? fallbackFontSize,
    },
    lineHeight,
  );
}

function buildMeasuredChars(
  paragraph: EditorParagraphNode,
  fragments: EditorLayoutFragment[],
  styles: Record<string, EditorNamedStyle> | undefined,
): MeasuredChar[] {
  const measured: MeasuredChar[] = [];
  const fallbackFontSize = Math.max(
    DEFAULT_FONT_SIZE,
    ...paragraph.runs
      .map((run) =>
        resolveEffectiveTextStyleForParagraph(run.styles, paragraph.style?.styleId, styles).fontSize ?? DEFAULT_FONT_SIZE,
      ),
  );

  for (const fragment of fragments) {
    const run = paragraph.runs.find((candidate) => candidate.id === fragment.runId);
    const effectiveStyles = resolveEffectiveTextStyleForParagraph(
      run?.styles,
      paragraph.style?.styleId,
      styles,
    );

    for (const char of fragment.chars) {
      measured.push({
        char: char.char,
        offset: char.paragraphOffset,
        width: measureCharacterWidth(char.char, effectiveStyles, fallbackFontSize),
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
  const paragraphStyle = resolveEffectiveParagraphStyle(paragraph.style, styles);
  const listGutter = paragraph.list ? DEFAULT_LIST_GUTTER : 0;
  const startInset = (paragraphStyle.indentLeft ?? 0) + listGutter + (isFirstLine ? (paragraphStyle.indentFirstLine ?? 0) : 0);
  const rightInset = paragraphStyle.indentRight ?? 0;
  return Math.max(MIN_CONTENT_WIDTH, contentWidth - rightInset - startInset);
}

function buildSlots(startOffset: number, endOffset: number, lefts: number[], top: number, height: number) {
  return Array.from({ length: endOffset - startOffset + 1 }, (_, slotIndex) => ({
    paragraphId: "",
    offset: startOffset + slotIndex,
    left: lefts[slotIndex] ?? lefts[lefts.length - 1] ?? 0,
    top,
    height,
  }));
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
    slots: buildSlots(startOffset, endOffset, slotLefts, top, height).map((slot) => ({
      ...slot,
      paragraphId,
    })),
    fragments: [],
  });
}

export function composeMeasuredParagraphLines(options: TextMeasureOptions): EditorLayoutLine[] {
  const { paragraph, fragments, styles, contentWidth } = options;
  const measuredChars = buildMeasuredChars(paragraph, fragments, styles);
  const tokens = tokenizeMeasuredChars(measuredChars);
  const fallbackFontSize = Math.max(
    DEFAULT_FONT_SIZE,
    ...paragraph.runs
      .map((run) =>
        resolveEffectiveTextStyleForParagraph(run.styles, paragraph.style?.styleId, styles).fontSize ?? DEFAULT_FONT_SIZE,
      ),
  );
  const lineHeight = getParagraphLineHeight(paragraph, styles, fallbackFontSize);
  const width = Math.max(MIN_CONTENT_WIDTH, contentWidth ?? DEFAULT_CONTENT_WIDTH);

  if (tokens.length === 0) {
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
            left: 0,
            top: 0,
            height: lineHeight,
          },
        ],
        fragments: [],
      },
    ];
  }

  const lines: EditorLayoutLine[] = [];
  let lineStartOffset = tokens[0]!.kind === "newline" ? tokens[0]!.chars[0]!.offset + 1 : tokens[0]!.chars[0]!.offset;
  let lineWidth = 0;
  let lineSlotLefts = [0];
  let lineEndOffset = lineStartOffset;
  let top = 0;
  let isFirstLine = true;

  const flushLine = () => {
    commitLine(lines, paragraph.id, lineStartOffset, lineEndOffset, lineSlotLefts, top, lineHeight);
    top += lineHeight;
    isFirstLine = false;
  };

  const resetLine = (nextOffset: number) => {
    lineStartOffset = nextOffset;
    lineEndOffset = nextOffset;
    lineWidth = 0;
    lineSlotLefts = [0];
  };

  const appendChars = (chars: MeasuredChar[]) => {
    for (const char of chars) {
      lineWidth += char.width;
      lineEndOffset = char.offset + 1;
      lineSlotLefts.push(lineWidth);
    }
  };

  for (const token of tokens) {
    if (token.kind === "newline") {
      flushLine();
      resetLine(token.chars[0]!.offset + 1);
      continue;
    }

    const availableWidth = getAvailableWidth(paragraph, styles, width, isFirstLine);
    const fitsCurrentLine = lineWidth + token.width <= availableWidth;
    const isEmptyLine = lineStartOffset === lineEndOffset;
    if (fitsCurrentLine || (isEmptyLine && token.kind === "whitespace")) {
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

    let nextLineWidth = getAvailableWidth(paragraph, styles, width, isFirstLine);
    let currentChunk: MeasuredChar[] = [];
    let currentChunkWidth = 0;

    for (const char of token.chars) {
      if (currentChunk.length > 0 && currentChunkWidth + char.width > nextLineWidth) {
        appendChars(currentChunk);
        flushLine();
        resetLine(char.offset);
        nextLineWidth = getAvailableWidth(paragraph, styles, width, isFirstLine);
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

  if (lines.length === 0 || lineStartOffset !== lineEndOffset || lineSlotLefts.length > 1) {
    flushLine();
  }

  return lines;
}

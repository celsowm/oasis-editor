import type { EditorParagraphNode, EditorTextRun } from "../../../core/model.js";
import type { PdfTextMeasurer } from "./PdfTextMeasurer.js";

export interface PdfParagraphTextContext {
  pageNumber: number;
  totalPages: number;
  measurer: PdfTextMeasurer;
}

export interface PdfParagraphFragment {
  run: EditorTextRun;
  text: string;
  x: number;
  width: number;
  fontSize: number;
}

export interface PdfParagraphLine {
  fragments: PdfParagraphFragment[];
  width: number;
  height: number;
}

export interface PdfParagraphLayout {
  lines: PdfParagraphLine[];
  width: number;
  height: number;
}

export interface LayoutPdfParagraphOptions {
  paragraph: EditorParagraphNode;
  maxWidth: number;
  context: PdfParagraphTextContext;
  defaultFontSize: number;
  defaultLineHeight: number;
  pxToPt: (value: number) => number;
}

interface PdfTextToken {
  run: EditorTextRun;
  text: string;
  width: number;
  fontSize: number;
  forcedBreak?: boolean;
}

const TOKEN_PATTERN = /\n|\S+\s*|\s+/gu;

export function resolvePdfRunText(run: EditorTextRun, context: PdfParagraphTextContext): string {
  if (run.field) {
    return run.field.type === "NUMPAGES" ? String(context.totalPages) : String(context.pageNumber);
  }
  if (run.image) {
    return "";
  }
  return run.text;
}

export function pdfRunFontSizePt(
  run: EditorTextRun,
  defaultFontSize: number,
  pxToPt: (value: number) => number,
): number {
  return run.styles?.fontSize !== undefined && run.styles.fontSize !== null
    ? pxToPt(run.styles.fontSize)
    : defaultFontSize;
}

export function measurePdfRunTextWidthPt(
  run: EditorTextRun,
  text: string,
  context: PdfParagraphTextContext,
  defaultFontSize: number,
  pxToPt: (value: number) => number,
): number {
  return context.measurer.measureTextWidth({
    text,
    fontFamily: run.styles?.fontFamily,
    fontSize: pdfRunFontSizePt(run, defaultFontSize, pxToPt),
    bold: run.styles?.bold,
    italic: run.styles?.italic,
  });
}

function tokenizeRun(
  run: EditorTextRun,
  text: string,
  options: LayoutPdfParagraphOptions,
): PdfTextToken[] {
  const tokens: PdfTextToken[] = [];
  const fontSize = pdfRunFontSizePt(run, options.defaultFontSize, options.pxToPt);

  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const tokenText = match[0];
    if (tokenText === "\n") {
      tokens.push({ run, text: "", width: 0, fontSize, forcedBreak: true });
      continue;
    }
    if (tokenText.length === 0) {
      continue;
    }

    tokens.push({
      run,
      text: tokenText,
      width: measurePdfRunTextWidthPt(run, tokenText, options.context, options.defaultFontSize, options.pxToPt),
      fontSize,
    });
  }

  return tokens;
}

function tokenCreatesVisibleText(token: PdfTextToken): boolean {
  return token.text.trim().length > 0;
}

function createLine(tokens: PdfTextToken[], defaultLineHeight: number): PdfParagraphLine {
  let x = 0;
  let width = 0;
  let maxFontSize = 0;
  const fragments: PdfParagraphFragment[] = [];

  for (const token of tokens) {
    if (token.text.length === 0) {
      continue;
    }
    fragments.push({
      run: token.run,
      text: token.text,
      x,
      width: token.width,
      fontSize: token.fontSize,
    });
    x += token.width;
    width += token.width;
    maxFontSize = Math.max(maxFontSize, token.fontSize);
  }

  return {
    fragments,
    width,
    height: Math.max(defaultLineHeight, maxFontSize * 1.2),
  };
}

function pushLine(lines: PdfParagraphLine[], tokens: PdfTextToken[], defaultLineHeight: number): void {
  const withoutLeadingWhitespace = tokens.slice();
  while (withoutLeadingWhitespace.length > 0 && !tokenCreatesVisibleText(withoutLeadingWhitespace[0]!)) {
    withoutLeadingWhitespace.shift();
  }

  const withoutTrailingWhitespace = withoutLeadingWhitespace;
  while (
    withoutTrailingWhitespace.length > 0 &&
    !tokenCreatesVisibleText(withoutTrailingWhitespace[withoutTrailingWhitespace.length - 1]!)
  ) {
    withoutTrailingWhitespace.pop();
  }

  lines.push(createLine(withoutTrailingWhitespace, defaultLineHeight));
}

export function layoutPdfParagraph(options: LayoutPdfParagraphOptions): PdfParagraphLayout {
  const maxWidth = Math.max(1, options.maxWidth);
  const tokens: PdfTextToken[] = [];

  for (const run of options.paragraph.runs) {
    const text = resolvePdfRunText(run, options.context);
    if (text.length === 0) {
      continue;
    }
    tokens.push(...tokenizeRun(run, text, options));
  }

  if (tokens.length === 0) {
    const emptyLine = createLine([], options.defaultLineHeight);
    return { lines: [emptyLine], width: 0, height: emptyLine.height };
  }

  const lines: PdfParagraphLine[] = [];
  let lineTokens: PdfTextToken[] = [];
  let lineWidth = 0;

  for (const token of tokens) {
    if (token.forcedBreak) {
      pushLine(lines, lineTokens, options.defaultLineHeight);
      lineTokens = [];
      lineWidth = 0;
      continue;
    }

    if (
      lineTokens.length > 0 &&
      tokenCreatesVisibleText(token) &&
      lineWidth + token.width > maxWidth
    ) {
      pushLine(lines, lineTokens, options.defaultLineHeight);
      lineTokens = [];
      lineWidth = 0;
    }

    if (lineTokens.length === 0 && !tokenCreatesVisibleText(token)) {
      continue;
    }

    lineTokens.push(token);
    lineWidth += token.width;
  }

  if (lineTokens.length > 0 || lines.length === 0) {
    pushLine(lines, lineTokens, options.defaultLineHeight);
  }

  const width = lines.reduce((max, line) => Math.max(max, line.width), 0);
  const height = lines.reduce((sum, line) => sum + line.height, 0);
  return { lines, width, height };
}

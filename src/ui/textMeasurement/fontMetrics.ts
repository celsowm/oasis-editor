import type { EditorTextStyle } from "../../core/model.js";
import { DEFAULT_FONT_SIZE } from "./constants.js";

const DEFAULT_WORD_SINGLE_LINE_RATIO = 1.223;

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

export function getMeasuredFontSize(
  styles: EditorTextStyle | undefined,
  fallbackFontSize: number,
): number {
  const fontSize = styles?.fontSize ?? fallbackFontSize;
  return styles?.smallCaps ? fontSize * 0.8 : fontSize;
}

export function getRenderedMeasureChar(
  char: string,
  styles: EditorTextStyle | undefined,
): string {
  return styles?.allCaps ? char.toUpperCase() : char;
}

export function buildCanvasFont(
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

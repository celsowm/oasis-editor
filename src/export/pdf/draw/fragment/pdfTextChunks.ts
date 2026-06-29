import type { EditorTextStyle } from "@/core/model.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { pxToPt } from "@/export/pdf/units.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import type { FragmentSlot } from "../fragmentGeometry.js";
import { blendColorWithWhite } from "./pdfColor.js";

export interface TextChunkCtx {
  writer: OasisPdfWriter;
  pageIndex: number;
  baselineY: number;
  fontSizePt: number;
  mainColor: string;
  gradientShadingName: string | undefined;
  styles: Required<EditorTextStyle>;
  baseTextOptions: {
    fontSize: number;
    bold: boolean | undefined;
    italic: boolean | undefined;
    fontResourceName: string;
    characterSpacing: number;
    horizontalScale: number;
    fontFeatures: string[];
  };
}

// Paints all per-chunk glyph-level effects for a single text run chunk.
export function emitTextChunk(
  ctx: TextChunkCtx,
  leftPx: number,
  text: string,
): void {
  const {
    writer,
    pageIndex,
    baselineY,
    fontSizePt,
    mainColor,
    gradientShadingName,
    styles,
    baseTextOptions,
  } = ctx;
  const offsetPt = pxToPt(1);

  if (styles.emboss || styles.imprint) {
    const dir = styles.imprint ? 1 : -1;
    writer.drawText(pageIndex, {
      ...baseTextOptions,
      x: pxToPt(leftPx) + offsetPt * dir,
      y: pxToPt(baselineY) + offsetPt * dir,
      text,
      color: "#BFBFBF",
    });
  }

  if (styles.glow) {
    const gl = styles.glow;
    const r = pxToPt(gl.radiusPt * PX_PER_POINT) * 0.5;
    const glowColor = blendColorWithWhite(gl.color, (gl.alpha ?? 0.5) * 0.4);
    const dirs: [number, number][] = [
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
      [r * 0.7, r * 0.7],
      [-r * 0.7, r * 0.7],
      [r * 0.7, -r * 0.7],
      [-r * 0.7, -r * 0.7],
    ];
    for (const [dx, dy] of dirs) {
      writer.drawText(pageIndex, {
        ...baseTextOptions,
        x: pxToPt(leftPx) + dx,
        y: pxToPt(baselineY) + dy,
        text,
        color: glowColor,
      });
    }
  }

  if (styles.textShadow) {
    const ts = styles.textShadow;
    const dirRad = (ts.dirDeg * Math.PI) / 180;
    const shadowOffsetPt = pxToPt(ts.distPt * PX_PER_POINT);
    writer.drawText(pageIndex, {
      ...baseTextOptions,
      x: pxToPt(leftPx) + Math.cos(dirRad) * shadowOffsetPt,
      y: pxToPt(baselineY) + Math.sin(dirRad) * shadowOffsetPt,
      text,
      color: ts.color,
    });
  } else if (styles.shadow) {
    writer.drawText(pageIndex, {
      ...baseTextOptions,
      x: pxToPt(leftPx) + offsetPt,
      y: pxToPt(baselineY) + offsetPt,
      text,
      color: "#808080",
    });
  }

  if (styles.reflection) {
    const ref = styles.reflection;
    const avgAlpha = (ref.startAlpha + ref.endAlpha) / 2;
    const refColor = blendColorWithWhite(mainColor, avgAlpha * 0.6);
    writer.drawText(pageIndex, {
      ...baseTextOptions,
      x: pxToPt(leftPx),
      y: pxToPt(baselineY) + pxToPt(ref.distPt * PX_PER_POINT) + fontSizePt,
      text,
      color: refColor,
    });
  }

  const textOutline = styles.textOutline;
  writer.drawText(pageIndex, {
    ...baseTextOptions,
    x: pxToPt(leftPx),
    y: pxToPt(baselineY),
    text,
    color: mainColor,
    ...(gradientShadingName
      ? { gradientShadingName }
      : textOutline
        ? {
            renderMode: 2,
            strokeColor: textOutline.color ?? mainColor,
            strokeWidth: textOutline.widthPt,
          }
        : { renderMode: styles.outline ? 1 : 0 }),
  });
}

export function groupSlotChunksByWhitespace(
  chars: FragmentSlot[],
): FragmentSlot[][] {
  const chunks: FragmentSlot[][] = [];
  let current: FragmentSlot[] = [];
  for (const char of chars) {
    if (char.char === " ") {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
      }
      continue;
    }
    current.push(char);
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function groupSlotChunksByOffsetGaps(
  chars: FragmentSlot[],
): FragmentSlot[][] {
  const chunks: FragmentSlot[][] = [];
  let current: FragmentSlot[] = [];
  for (const char of chars) {
    const previous = current[current.length - 1];
    if (previous && char.offset > previous.offset + 1) {
      chunks.push(current);
      current = [];
    }
    current.push(char);
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

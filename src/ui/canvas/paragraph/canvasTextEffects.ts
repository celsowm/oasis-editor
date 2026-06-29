import type { EditorLayoutLine } from "@/core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
import { parseHexColorToRgb255 } from "@/core/color.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import { DEG_TO_RAD } from "../canvasBorders.js";
import { resolveGradientAxis } from "@/core/gradientAxis.js";
import { resolveFragmentPaintBounds } from "./canvasRunBackground.js";

export function hexToRgba(color: string, alpha: number): string {
  const [r, g, b] = parseHexColorToRgb255(color) ?? [0, 0, 0];
  return `rgba(${r},${g},${b},${alpha})`;
}

// Resolves ctx.fillStyle from textFill (solid or gradient) or falls back to color.
export function resolveCanvasTextFill(
  ctx: CanvasRenderingContext2D,
  styles: ReturnType<typeof resolveEffectiveTextStyleForParagraph>,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
): string | CanvasGradient {
  const fill = styles.textFill;
  if (!fill) return styles.color ?? "#000000";
  if (fill.type === "solid") return fill.color;
  if (fill.stops.length < 2) return styles.color ?? "#000000";
  const bounds = resolveFragmentPaintBounds(line, fragment);
  if (!bounds) return fill.stops[0]!.color;
  const x0 = originX + bounds.left;
  const x1 = originX + bounds.right;
  const y0 = originY + line.top;
  const y1 = originY + line.top + line.height;
  const axis = resolveGradientAxis(x0, y0, x1, y1, fill.angle ?? 0);
  const gradient = ctx.createLinearGradient(axis.x0, axis.y0, axis.x1, axis.y1);
  for (const stop of fill.stops) {
    gradient.addColorStop(
      stop.position,
      hexToRgba(stop.color, stop.alpha ?? 1),
    );
  }
  return gradient;
}

function drawScaledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
) {
  if (scale === 1) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Applies the glyph-level run effects (outline/shadow/emboss/imprint/glow/reflection).
export function drawStyledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  styles: {
    outline?: boolean;
    shadow?: boolean;
    emboss?: boolean;
    imprint?: boolean;
    textOutline?: { widthPt: number; color?: string } | null;
    textShadow?: {
      color: string;
      alpha?: number;
      blurPt: number;
      distPt: number;
      dirDeg: number;
    } | null;
    glow?: { color: string; alpha?: number; radiusPt: number } | null;
    reflection?: {
      blurPt: number;
      startAlpha: number;
      startPos: number;
      endAlpha: number;
      endPos: number;
      distPt: number;
    } | null;
  },
) {
  const hasEffects =
    styles.outline ||
    styles.shadow ||
    styles.textShadow ||
    styles.glow ||
    styles.emboss ||
    styles.imprint ||
    styles.textOutline ||
    styles.reflection;
  if (!hasEffects) {
    drawScaledText(ctx, text, x, y, scale);
    return;
  }

  if (styles.emboss || styles.imprint) {
    const offset = styles.imprint ? 1 : -1;
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    drawScaledText(ctx, text, x + offset, y + offset, scale);
    ctx.restore();
  }

  ctx.save();
  if (styles.textShadow) {
    const ts = styles.textShadow;
    const dirRad = ts.dirDeg * DEG_TO_RAD;
    const distPx = ts.distPt * PX_PER_POINT;
    ctx.shadowColor = hexToRgba(ts.color, ts.alpha ?? 1);
    ctx.shadowBlur = ts.blurPt * PX_PER_POINT;
    ctx.shadowOffsetX = Math.cos(dirRad) * distPx;
    ctx.shadowOffsetY = Math.sin(dirRad) * distPx;
  } else if (styles.glow) {
    const gl = styles.glow;
    ctx.shadowColor = hexToRgba(gl.color, gl.alpha ?? 0.7);
    ctx.shadowBlur = gl.radiusPt * PX_PER_POINT;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else if (styles.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 1;
  }
  if (styles.textOutline) {
    ctx.strokeStyle = styles.textOutline.color ?? (ctx.fillStyle as string);
    ctx.lineWidth = styles.textOutline.widthPt * PX_PER_POINT;
    drawScaledText(ctx, text, x, y, scale);
    if (scale === 1) {
      ctx.strokeText(text, x, y);
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, 1);
      ctx.strokeText(text, 0, 0);
      ctx.restore();
    }
  } else if (styles.outline) {
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = 0.75;
    if (scale === 1) {
      ctx.strokeText(text, x, y);
    } else {
      ctx.translate(x, y);
      ctx.scale(scale, 1);
      ctx.strokeText(text, 0, 0);
    }
  } else {
    drawScaledText(ctx, text, x, y, scale);
  }
  ctx.restore();

  if (styles.reflection) {
    const ref = styles.reflection;
    const distPx = ref.distPt * PX_PER_POINT;
    const avgAlpha = Math.max(
      0,
      Math.min(1, (ref.startAlpha + ref.endAlpha) / 2),
    );
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = avgAlpha;
    if (ref.blurPt > 0 && "filter" in ctx) {
      (ctx as CanvasRenderingContext2D & { filter: string }).filter =
        `blur(${ref.blurPt * PX_PER_POINT}px)`;
    }
    ctx.translate(0, 2 * y + distPx);
    ctx.scale(1, -1);
    drawScaledText(ctx, text, x, y, scale);
    ctx.restore();
  }
}

// Draws a vertically-mirrored reflection of the fragment text below the baseline.
export function drawFragmentReflection(
  ctx: CanvasRenderingContext2D,
  fragment: EditorLayoutLine["fragments"][number],
  slotByOffset: Map<number, EditorLayoutLine["slots"][number]>,
  styles: ReturnType<typeof resolveEffectiveTextStyleForParagraph>,
  originX: number,
  baselineY: number,
  reflection: {
    blurPt: number;
    startAlpha: number;
    endAlpha: number;
    distPt: number;
  },
) {
  const firstChar = fragment.chars.find(
    (c) => c.char !== "\n" && c.char !== "\t",
  );
  if (!firstChar) return;
  const firstSlot = slotByOffset.get(firstChar.paragraphOffset);
  if (!firstSlot) return;
  const text = fragment.chars
    .filter((c) => c.char !== "\n" && c.char !== "\t")
    .map((c) => (styles.allCaps ? c.char.toUpperCase() : c.char))
    .join("");
  if (!text) return;
  const scale =
    styles.characterScale && styles.characterScale > 0
      ? styles.characterScale / 100
      : 1;
  const avgAlpha = (reflection.startAlpha + reflection.endAlpha) / 2;
  const distPx = reflection.distPt * PX_PER_POINT;
  const reflectY = baselineY + distPx;
  ctx.save();
  ctx.globalAlpha = (ctx.globalAlpha ?? 1) * avgAlpha;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.translate(0, 2 * reflectY);
  ctx.scale(1, -1);
  const x = originX + firstSlot.left;
  if (scale === 1) {
    ctx.fillText(text, x, baselineY);
  } else {
    ctx.save();
    ctx.translate(x, baselineY);
    ctx.scale(scale, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export function getRenderedChar(
  char: string,
  styles: { allCaps?: boolean },
): string {
  return styles.allCaps ? char.toUpperCase() : char;
}

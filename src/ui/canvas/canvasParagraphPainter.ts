import type {
  EditorImageRunData,
  EditorLayoutLine,
  EditorPageSettings,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import {
  getImageFloatingGeometry,
  resolveFloatingObjectRect,
} from "@/layoutProjection/floatingObjects.js";
import { DEFAULT_FONT_SIZE_PX } from "@/core/units.js";
import { parseHexColorToRgb255 } from "@/core/color.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
  resolveImageSrc,
} from "@/core/model.js";
import { createEditorLogger } from "@/utils/logger.js";
import { getCachedCanvasImage } from "./canvasImageCache.js";
import { resolveListPrefix } from "./listNumbering.js";
import { paintTextBox } from "./canvasTextBoxPainter.js";
import { resolveTextBoxRenderHeight } from "./textBoxRenderHeight.js";
import { resolveInlineObjectRect } from "./canvasInlineReaders.js";
import type { CanvasBlockPainters } from "./canvasBlockPainters.js";
import {
  isDoubleUnderlineStyle,
  isWavyUnderlineStyle,
  type UnderlineStyle,
  underlineStyleDashArray,
  underlineStyleLineWidthPx,
  WAVY_UNDERLINE_AMPLITUDE_PX,
  WAVY_UNDERLINE_WAVELENGTH_PX,
} from "@/core/textStyleMappings.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import {
  CANVAS_DASH_DASHED,
  CANVAS_DASH_DOTTED,
  DEG_TO_RAD,
  drawBorderBox,
} from "./canvasBorders.js";
import { resolveMetricCompatibleFamily } from "@/export/pdf/fonts/officeFontAssets.js";
import {
  getAlignedListLabelInset,
  getListLabelInset,
} from "@/ui/textMeasurement/indentation.js";
import {
  applyCanvasTextFeatureHints,
  resolveCanvasRunPaintStyle,
} from "./canvasFontResolution.js";
export {
  applyCanvasTextFeatureHints,
  resolveCanvasFontFamily,
  resolveCanvasTextRenderMetrics,
  resolveCanvasRunPaintStyle,
} from "./canvasFontResolution.js";
/** Half-spacing between the two lines of a double-strikethrough, in px. */
const DOUBLE_STRIKE_OFFSET_PX = 1.3;
/** Half-spacing between the two lines of a double-underline, in px. */
const DOUBLE_UNDERLINE_OFFSET_PX = 1.5;

function hexToRgba(color: string, alpha: number): string {
  const [r, g, b] = parseHexColorToRgb255(color) ?? [0, 0, 0];
  return `rgba(${r},${g},${b},${alpha})`;
}

const canvasTextLogger = createEditorLogger("canvas-text");
const loggedCanvasFontKeys = new Set<string>();
const MAX_CANVAS_FONT_LOGS = 40;

function logCanvasFontUse(options: {
  requestedFamily: string | null | undefined;
  metricFamily: string;
  cssFont: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  sample: string;
}) {
  if (loggedCanvasFontKeys.size >= MAX_CANVAS_FONT_LOGS) {
    return;
  }
  const key = [
    options.requestedFamily ?? "",
    options.metricFamily,
    options.fontSize,
    options.bold,
    options.italic,
  ].join("|");
  if (loggedCanvasFontKeys.has(key)) {
    return;
  }
  loggedCanvasFontKeys.add(key);
  const style = options.italic ? "italic " : "";
  const weight = options.bold ? "700" : "400";
  const fontCheck =
    typeof document !== "undefined" && document.fonts
      ? document.fonts.check(
          `${style}${weight} ${options.fontSize}px "${options.metricFamily}"`,
        )
      : "unavailable";
  canvasTextLogger.info("font:use", {
    ...options,
    fontCheck,
    documentFontsStatus:
      typeof document !== "undefined" && document.fonts
        ? document.fonts.status
        : "unavailable",
  });
}

function resolveTabLeader(
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  tabLeft: number,
  state: EditorState,
): "dot" | "hyphen" | "underscore" | "heavy" | "middleDot" | undefined {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    state.document.styles,
  );
  const tabs = paragraphStyle.tabs ?? [];
  if (tabs.length === 0) {
    return undefined;
  }
  const lineStart = line.slots[0]?.left ?? 0;
  const relativeLeft = tabLeft - lineStart;
  const stop = tabs
    .filter((tab) => tab.type !== "clear")
    .map((tab) => ({ ...tab, positionPx: tab.position * PX_PER_POINT }))
    .filter((tab) => tab.positionPx > relativeLeft + 0.01)
    .sort((a, b) => a.positionPx - b.positionPx)[0];
  return stop?.leader && stop.leader !== "none" ? stop.leader : undefined;
}

function drawTabLeader(
  ctx: CanvasRenderingContext2D,
  leader: NonNullable<ReturnType<typeof resolveTabLeader>>,
  x1: number,
  x2: number,
  y: number,
) {
  if (x2 <= x1 + 2) {
    return;
  }
  ctx.save();
  ctx.lineWidth = leader === "heavy" ? 1.5 : 1;
  ctx.strokeStyle = ctx.fillStyle as string;
  if (leader === "dot" || leader === "middleDot") {
    ctx.setLineDash(CANVAS_DASH_DOTTED);
  } else if (leader === "hyphen") {
    ctx.setLineDash(CANVAS_DASH_DASHED);
  } else {
    ctx.setLineDash([]);
  }
  const leaderY = leader === "underscore" ? y + 2 : y;
  ctx.beginPath();
  ctx.moveTo(x1, leaderY);
  ctx.lineTo(x2, leaderY);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw an inline image fragment, honoring crop (`a:srcRect`), rotation
 * (`a:xfrm/@rot`) and horizontal/vertical flips (`a:xfrm/@flipH`/`@flipV`).
 *
 * The inline layout box (`x`, `y`, `width`, `height`) is preserved as-is;
 * rotation may visually extend beyond the line box, which matches the simple
 * inline rendering model (hit-testing still uses the unrotated box).
 */
function drawImageFragment(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
  image: EditorImageRunData,
  x: number,
  y: number,
): void {
  const { width, height, crop, fillMode, rotation, flipH, flipV } = image;
  const hasTransform = Boolean(rotation) || Boolean(flipH) || Boolean(flipV);

  // Tiled fill: repeat the image at its natural size across the display box.
  // Crop is not applied in tile mode (matches the simple inline model).
  if (fillMode === "tile") {
    const pattern = ctx.createPattern(img, "repeat");
    if (!pattern) {
      ctx.drawImage(img, x, y, width, height);
      return;
    }
    ctx.save();
    if (hasTransform) {
      ctx.translate(x + width / 2, y + height / 2);
      if (rotation) {
        ctx.rotate(rotation * DEG_TO_RAD);
      }
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }
    ctx.translate(x, y);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  // Resolve the source rectangle from the crop fractions, clamped so we never
  // produce a zero/negative source region.
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (crop) {
    const left = clamp01(crop.left ?? 0);
    const top = clamp01(crop.top ?? 0);
    const right = clamp01(crop.right ?? 0);
    const bottom = clamp01(crop.bottom ?? 0);
    if (left + right < 1 && top + bottom < 1) {
      sx = left * img.naturalWidth;
      sy = top * img.naturalHeight;
      sw = (1 - left - right) * img.naturalWidth;
      sh = (1 - top - bottom) * img.naturalHeight;
    }
  }

  if (!hasTransform) {
    ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
    return;
  }

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  if (rotation) {
    ctx.rotate(rotation * DEG_TO_RAD);
  }
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value > 1 ? 1 : value;
}

/**
 * Paints the floating images anchored within a paragraph, mirroring
 * `drawFloatingTextBoxesForParagraph`. Split into `behind`/`front` layers so a
 * `behindDoc` image renders under the text and others render over it.
 */
export function drawFloatingImagesForParagraph(options: {
  ctx: CanvasRenderingContext2D;
  paragraphLines: EditorLayoutLine[];
  state: EditorState;
  pageSettings: EditorPageSettings;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  onUpdate: () => void;
  layer: "behind" | "front";
}): void {
  const {
    ctx,
    paragraphLines,
    state,
    pageSettings,
    contentLeft,
    contentTop,
    contentWidth,
    paragraphTop,
    onUpdate,
    layer,
  } = options;

  for (const line of paragraphLines) {
    const slotByOffset = new Map(
      line.slots.map((slot) => [slot.offset, slot] as const),
    );

    for (const fragment of line.fragments) {
      const image = fragment.image;
      if (!image?.floating) {
        continue;
      }

      const isBehind = Boolean(image.floating.behindDoc);
      if ((layer === "behind") !== isBehind) {
        continue;
      }

      const slot = slotByOffset.get(fragment.startOffset);
      const anchorLeft = contentLeft + (slot?.left ?? 0);
      const lineTop = paragraphTop + line.top;

      const rect = resolveFloatingObjectRect({
        object: getImageFloatingGeometry(image),
        pageSettings,
        contentLeft,
        contentTop,
        contentWidth,
        paragraphTop,
        lineTop,
        anchorLeft,
      });

      const src = resolveImageSrc(state.document, image.src);
      const img = getCachedCanvasImage(src, onUpdate);
      if (img.complete && img.naturalWidth > 0) {
        drawImageFragment(ctx, img, image, rect.x, rect.y);
      }
    }
  }
}

export function drawParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  state: EditorState,
  originX: number,
  originY: number,
  onUpdate: () => void,
  painters: CanvasBlockPainters,
  pageIndex = 0,
) {
  for (const line of lines) {
    const slotByOffset = new Map<number, (typeof line.slots)[number]>();
    for (const slot of line.slots) {
      slotByOffset.set(slot.offset, slot);
    }
    const baselineY = originY + line.top + line.height * 0.8;

    const listPrefix =
      line.index === 0 ? resolveListPrefix(paragraph, state.document) : "";
    if (listPrefix) {
      const prefixStyles = resolveEffectiveTextStyleForParagraph(
        paragraph.runs[0]?.styles,
        paragraph.style?.styleId,
        state.document.styles,
      );
      const { font: prefixFont, fillStyle: prefixFillStyle } =
        resolveCanvasRunPaintStyle(prefixStyles);
      ctx.save();
      ctx.font = prefixFont;
      ctx.fillStyle = prefixFillStyle;
      const first = line.slots[0];
      const gap = ctx.measureText(`${listPrefix} `).width;
      const labelInset = getListLabelInset(paragraph, state.document.styles);
      const labelWidth = ctx.measureText(listPrefix).width;
      // Label sits in the hanging area; first-line text begins at the text
      // indent (advanced to the suffix tab stop). If the label would overrun
      // the text start, fall back to gluing it just before the text.
      const alignedLeft = getAlignedListLabelInset(
        paragraph,
        state.document.styles,
        first?.left ?? labelInset + labelWidth,
        labelWidth,
      );
      const left =
        first !== undefined && labelInset + labelWidth > first.left
          ? Math.max(0, first.left - gap)
          : alignedLeft;
      ctx.fillText(listPrefix, originX + left, baselineY);
      ctx.restore();
    }
    for (const fragment of line.fragments) {
      const styles = resolveEffectiveTextStyleForParagraph(
        fragment.styles,
        paragraph.style?.styleId,
        state.document.styles,
      );
      if (styles.hidden) {
        continue;
      }
      const fontSize = styles.fontSize ?? DEFAULT_FONT_SIZE_PX;
      const metricFamily = resolveMetricCompatibleFamily(
        styles.fontFamily ?? "Calibri",
      );
      const { font, renderMetrics } = resolveCanvasRunPaintStyle(styles);
      ctx.save();
      ctx.font = font;
      // Apply the typography intent Canvas 2D can express: kerning (w:kern) via
      // ctx.fontKerning and a coarse ligature hint (w14:ligatures) via
      // ctx.textRendering — kept consistent with the metric-only measurement.
      // The remaining w14 features (numForm, numSpacing, stylisticSet,
      // contextualAlternates) have no Canvas 2D API (no font-variant-numeric /
      // font-variant-ligatures / font-feature-settings) and stay a documented
      // canvas limitation; HTML/CSS honours them via styleCss.ts. See
      // applyCanvasTextFeatureHints for the full rationale.
      applyCanvasTextFeatureHints(ctx, styles, fontSize);
      logCanvasFontUse({
        requestedFamily: styles.fontFamily,
        metricFamily,
        cssFont: ctx.font,
        fontSize: renderMetrics.fontSize,
        bold: Boolean(styles.bold),
        italic: Boolean(styles.italic),
        sample: fragment.text.slice(0, 80),
      });
      ctx.fillStyle = resolveCanvasTextFill(
        ctx,
        styles,
        line,
        fragment,
        originX,
        originY,
      );
      if (styles.shading) {
        drawFragmentShading(
          ctx,
          line,
          fragment,
          originX,
          originY,
          styles.shading,
        );
      }
      if (styles.highlight) {
        drawFragmentHighlight(
          ctx,
          line,
          fragment,
          originX,
          originY,
          styles.highlight,
        );
      }
      if (styles.textBorder) {
        drawFragmentBorder(
          ctx,
          line,
          fragment,
          originX,
          originY,
          styles.textBorder,
        );
      }
      if (fragment.image && !fragment.image.floating) {
        const slot = slotByOffset.get(fragment.startOffset);
        if (slot) {
          const src = resolveImageSrc(state.document, fragment.image.src);
          const img = getCachedCanvasImage(src, onUpdate);
          if (img.complete && img.naturalWidth > 0) {
            // Shared geometry: keeps paint aligned with hit-testing (audit #6).
            const rect = resolveInlineObjectRect({
              originLeft: originX,
              originTop: originY,
              lineTop: line.top,
              lineHeight: line.height,
              slotLeft: slot.left,
              objectWidth: fragment.image.width,
              objectHeight: fragment.image.height,
            });
            drawImageFragment(ctx, img, fragment.image, rect.left, rect.top);
          }
        }
      } else if (fragment.textBox && !fragment.textBox.floating) {
        const slot = slotByOffset.get(fragment.startOffset);
        if (slot) {
          const textBox = fragment.textBox;
          const height = resolveTextBoxRenderHeight(textBox, state, pageIndex);
          // Shared geometry: keeps paint aligned with hit-testing (audit #6).
          const rect = resolveInlineObjectRect({
            originLeft: originX,
            originTop: originY,
            lineTop: line.top,
            lineHeight: line.height,
            slotLeft: slot.left,
            objectWidth: textBox.width,
            objectHeight: height,
          });
          paintTextBox(
            ctx,
            textBox,
            state,
            rect.left,
            rect.top,
            rect.width,
            rect.height,
            pageIndex,
            onUpdate,
            painters,
          );
        }
      } else {
        drawTextFragment(
          ctx,
          paragraph,
          line,
          fragment,
          slotByOffset,
          state,
          styles,
          originX,
          baselineY + renderMetrics.baselineOffset,
        );
        if (styles.reflection) {
          drawFragmentReflection(
            ctx,
            fragment,
            slotByOffset,
            styles,
            originX,
            baselineY + renderMetrics.baselineOffset,
            styles.reflection,
          );
        }
      }
      if (styles.underline) {
        drawTextDecoration(
          ctx,
          line,
          fragment,
          originX,
          originY,
          "underline",
          styles.underlineStyle ?? undefined,
          styles.underlineColor ?? undefined,
        );
      }
      if (styles.strike) {
        drawTextDecoration(ctx, line, fragment, originX, originY, "strike");
      }
      if (styles.doubleStrike) {
        drawTextDecoration(
          ctx,
          line,
          fragment,
          originX,
          originY,
          "doubleStrike",
        );
      }
      if (styles.emphasisMark) {
        drawFragmentEmphasis(
          ctx,
          line,
          fragment,
          slotByOffset,
          originX,
          originY,
          styles.emphasisMark,
          styles.color ?? "#000000",
        );
      }
      ctx.restore();
    }

    // Automatic hyphenation: draw a trailing hyphen past the last character,
    // using the last text fragment's style. It is render-only (no caret slot).
    if (line.trailingHyphen) {
      const lastFragment = [...line.fragments]
        .reverse()
        .find(
          (fragment) => fragment.text && !fragment.image && !fragment.textBox,
        );
      const endSlot =
        slotByOffset.get(line.endOffset) ?? line.slots[line.slots.length - 1];
      if (lastFragment && endSlot) {
        const styles = resolveEffectiveTextStyleForParagraph(
          lastFragment.styles,
          paragraph.style?.styleId,
          state.document.styles,
        );
        if (!styles.hidden) {
          const { font, fillStyle, renderMetrics, scale } =
            resolveCanvasRunPaintStyle(styles);
          ctx.save();
          ctx.font = font;
          ctx.fillStyle = fillStyle;
          drawStyledText(
            ctx,
            "-",
            originX + endSlot.left,
            baselineY + renderMetrics.baselineOffset,
            scale,
            styles,
          );
          ctx.restore();
        }
      }
    }

    const isLastLine = line.index === lines.length - 1;
    if (state.showParagraphMarks && isLastLine) {
      const lastSlot = line.slots[line.slots.length - 1];
      const markSlot =
        line.slots.find((slot) => slot.offset === line.endOffset) ?? lastSlot;
      if (markSlot) {
        ctx.save();
        ctx.font = "400 13px Calibri";
        ctx.fillStyle = "#9ca3af";
        const y = originY + line.top + line.height * 0.8;
        ctx.fillText("\u00B6", originX + markSlot.left + 2, y);
        ctx.restore();
      }
    }
  }
}

function drawFragmentColorRect(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
  alpha?: number,
) {
  const bounds = resolveFragmentPaintBounds(line, fragment);
  if (!bounds) return;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(
    originX + bounds.left,
    originY + line.top + 2,
    Math.max(0, bounds.right - bounds.left),
    Math.max(2, line.height - 4),
  );
  ctx.restore();
}

function drawFragmentHighlight(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
) {
  drawFragmentColorRect(ctx, line, fragment, originX, originY, color, 0.35);
}

export function resolveFragmentPaintBounds(
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
): { left: number; right: number } | null {
  const slotByOffset = new Map(
    line.slots.map((slot) => [slot.offset, slot] as const),
  );
  const slots = fragment.chars
    .filter((char) => char.char !== "\n")
    .map((char) => slotByOffset.get(char.paragraphOffset))
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  if (slots.length === 0) return null;

  const first = slots[0]!;
  const last = slots[slots.length - 1]!;
  const nextSlot = slotByOffset.get(last.offset + 1);
  if (nextSlot) {
    return { left: first.left, right: nextSlot.left };
  }

  const lastSlotIndex = line.slots.findIndex(
    (slot) => slot.offset === last.offset,
  );
  const followingSlot =
    lastSlotIndex >= 0 ? line.slots[lastSlotIndex + 1] : undefined;
  return {
    left: first.left,
    right: followingSlot?.left ?? last.left + Math.max(8, line.height * 0.45),
  };
}

// Run shading (w:shd) is a solid background fill behind the text, unlike the
// semi-transparent highlighter pen handled by drawFragmentHighlight.
function drawFragmentShading(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
) {
  drawFragmentColorRect(ctx, line, fragment, originX, originY, color);
}

function getRenderedChar(char: string, styles: { allCaps?: boolean }): string {
  return styles.allCaps ? char.toUpperCase() : char;
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

// Resolves ctx.fillStyle from textFill (solid or gradient) or falls back to color.
function resolveCanvasTextFill(
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
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const angleDeg = fill.angle ?? 0;
  const rad = angleDeg * DEG_TO_RAD;
  const dx = (Math.cos(rad) * (x1 - x0)) / 2;
  const dy = (Math.sin(rad) * (y1 - y0)) / 2;
  const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  for (const stop of fill.stops) {
    gradient.addColorStop(stop.position, hexToRgba(stop.color, stop.alpha ?? 1));
  }
  return gradient;
}

// Applies the glyph-level run effects (outline/shadow/emboss/imprint) on top of
// the plain scaled fill. emboss/imprint draw a light relief copy offset behind
// the main glyphs; shadow/glow/textShadow use the canvas shadow API; outline
// strokes hollow text. textOutline (w14) overrides the legacy boolean outline.
function drawStyledText(
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
    // Reflect below the baseline using avg(startAlpha, endAlpha) as a single-pass
    // approximation of the top-to-bottom alpha fade. The transform flips the text
    // around the line at (y + distPx/2) so the reflection top starts at y+distPx.
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

// Run border (w:bdr): a box stroked around the run's text on all four edges.
function drawFragmentBorder(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  border: {
    width: number;
    type: "solid" | "dashed" | "dotted" | "none";
    color: string;
  },
) {
  if (border.type === "none" || border.width <= 0) return;
  const bounds = resolveFragmentPaintBounds(line, fragment);
  if (!bounds) return;
  const edge = { ...border, width: Math.max(0.5, border.width * PX_PER_POINT) };
  drawBorderBox(
    ctx,
    originX + bounds.left,
    originY + line.top + 1,
    Math.max(0, bounds.right - bounds.left),
    Math.max(2, line.height - 2),
    { top: edge, right: edge, bottom: edge, left: edge },
  );
}

const EMPHASIS_GLYPH: Record<string, string> = {
  dot: "•",
  comma: "‚",
  circle: "○",
  underDot: "•",
};

// Run emphasis mark (w:em): a small glyph drawn above each character (below for
// underDot), centered on the slot.
function drawFragmentEmphasis(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  slotByOffset: Map<number, EditorLayoutLine["slots"][number]>,
  originX: number,
  originY: number,
  mark: string,
  color: string,
) {
  if (mark === "none") return;
  const glyph = EMPHASIS_GLYPH[mark];
  if (!glyph) return;
  const below = mark === "underDot";
  const y = below
    ? originY + line.top + line.height + 1
    : originY + line.top + 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = below ? "top" : "bottom";
  ctx.font = `400 ${Math.max(6, line.height * 0.35)}px Calibri`;
  for (const char of fragment.chars) {
    if (char.char === "\n" || char.char === "\t" || char.char === " ") continue;
    const slot = slotByOffset.get(char.paragraphOffset);
    const nextSlot = slotByOffset.get(char.paragraphOffset + 1);
    if (!slot) continue;
    const centerX = nextSlot
      ? (slot.left + nextSlot.left) / 2
      : slot.left + line.height * 0.25;
    ctx.fillText(glyph, originX + centerX, y);
  }
  ctx.restore();
}

function drawTextFragment(
  ctx: CanvasRenderingContext2D,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  slotByOffset: Map<number, EditorLayoutLine["slots"][number]>,
  state: EditorState,
  styles: ReturnType<typeof resolveEffectiveTextStyleForParagraph>,
  originX: number,
  baselineY: number,
) {
  const scale =
    styles.characterScale && styles.characterScale > 0
      ? styles.characterScale / 100
      : 1;
  const hasManualCharacterSpacing =
    styles.characterSpacing !== undefined &&
    styles.characterSpacing !== null &&
    styles.characterSpacing !== 0;

  let segmentText = "";
  let segmentLeft: number | null = null;

  const flushSegment = () => {
    if (!segmentText || segmentLeft === null) {
      segmentText = "";
      segmentLeft = null;
      return;
    }
    drawStyledText(
      ctx,
      segmentText,
      originX + segmentLeft,
      baselineY,
      scale,
      styles,
    );
    segmentText = "";
    segmentLeft = null;
  };

  for (const char of fragment.chars) {
    if (char.char === "\n") {
      flushSegment();
      continue;
    }
    const slot = slotByOffset.get(char.paragraphOffset);
    if (!slot) {
      flushSegment();
      continue;
    }
    if (char.char === "\t") {
      flushSegment();
      const nextSlot = slotByOffset.get(char.paragraphOffset + 1);
      const leader = resolveTabLeader(paragraph, line, slot.left, state);
      if (nextSlot && leader) {
        drawTabLeader(
          ctx,
          leader,
          originX + slot.left,
          originX + nextSlot.left,
          baselineY,
        );
      }
      continue;
    }

    const renderedChar = getRenderedChar(char.char, styles);
    if (hasManualCharacterSpacing) {
      flushSegment();
      drawStyledText(
        ctx,
        renderedChar,
        originX + slot.left,
        baselineY,
        scale,
        styles,
      );
      continue;
    }

    if (char.char === " ") {
      flushSegment();
      segmentLeft = slot.left;
      segmentText = renderedChar;
      flushSegment();
      continue;
    }

    if (segmentLeft === null) {
      segmentLeft = slot.left;
    }
    segmentText += renderedChar;
  }

  flushSegment();
}

// Draws a vertically-mirrored reflection of the fragment text below the baseline.
// The reflection is a single pass with averaged alpha; the fade is approximated.
function drawFragmentReflection(
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
  // Mirror Y about reflectY: translate to reflectY, scale(1,-1), draw at original coords.
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

function drawTextDecoration(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  kind: "underline" | "strike" | "doubleStrike",
  underlineStyle?: UnderlineStyle,
  underlineColor?: string,
) {
  const bounds = resolveFragmentPaintBounds(line, fragment);
  if (!bounds) return;
  const y =
    kind === "underline"
      ? originY + line.top + line.height - 2
      : kind === "doubleStrike"
        ? originY + line.top + line.height * 0.5
        : originY + line.top + line.height * 0.52;
  const x1 = originX + bounds.left;
  const x2 = originX + bounds.right;
  ctx.save();
  ctx.strokeStyle = underlineColor || (ctx.fillStyle as string);

  if (kind === "underline") {
    drawUnderlineWithStyle(ctx, x1, x2, y, underlineStyle);
  } else if (kind === "doubleStrike") {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.moveTo(x1, y - DOUBLE_STRIKE_OFFSET_PX);
    ctx.lineTo(x2, y - DOUBLE_STRIKE_OFFSET_PX);
    ctx.moveTo(x1, y + DOUBLE_STRIKE_OFFSET_PX);
    ctx.lineTo(x2, y + DOUBLE_STRIKE_OFFSET_PX);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUnderlineWithStyle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  underlineStyle: UnderlineStyle,
) {
  ctx.setLineDash([]);
  ctx.lineWidth = underlineStyleLineWidthPx(underlineStyle);

  if (isDoubleUnderlineStyle(underlineStyle)) {
    ctx.beginPath();
    ctx.moveTo(x1, y - DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.lineTo(x2, y - DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.moveTo(x1, y + DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.lineTo(x2, y + DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.stroke();
    return;
  }

  if (isWavyUnderlineStyle(underlineStyle)) {
    drawWavyLine(ctx, x1, x2, y);
    return;
  }

  const dashArray = underlineStyleDashArray(underlineStyle);
  if (dashArray) {
    ctx.setLineDash(dashArray);
  }

  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWavyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  for (let x = x1; x <= x2; x += 1) {
    const dy =
      Math.sin(((x - x1) / WAVY_UNDERLINE_WAVELENGTH_PX) * Math.PI) *
      WAVY_UNDERLINE_AMPLITUDE_PX;
    ctx.lineTo(x, y + dy);
  }
  ctx.stroke();
}

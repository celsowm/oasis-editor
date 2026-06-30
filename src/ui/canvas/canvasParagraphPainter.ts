import type {
  EditorLayoutLine,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { DEFAULT_FONT_SIZE_PX } from "@/core/units.js";
import {
  TEXT_BASELINE_RATIO,
  resolveTextAlignmentBaselineOffset,
} from "@/core/layoutConstants.js";
import { createEditorLogger } from "@/utils/logger.js";
import { resolveListPrefix } from "./listNumbering.js";
import { paintTextBox } from "./canvasTextBoxPainter.js";
import { resolveTextBoxRenderHeight } from "./textBoxRenderHeight.js";
import { resolveInlineObjectRect } from "./canvasInlineReaders.js";
import type { CanvasBlockPainters } from "./canvasBlockPainters.js";
import { resolveMetricCompatibleFamily } from "@/export/pdf/fonts/officeFontAssets.js";
import {
  getAlignedListLabelInset,
  getListLabelInset,
} from "@/ui/textMeasurement/indentation.js";
import {
  applyCanvasTextFeatureHints,
  resolveCanvasRunPaintStyle,
} from "./canvasFontResolution.js";
import { getCachedCanvasImage } from "./canvasImageCache.js";
import { resolveImageSrc } from "@/core/model.js";

// Sub-module imports — each owns one rendering concern.
import {
  drawFragmentHighlight,
  drawFragmentShading,
  drawFragmentBorder,
} from "./paragraph/canvasRunBackground.js";
import {
  drawStyledText,
  drawFragmentReflection,
  resolveCanvasTextFill,
  getRenderedChar,
} from "./paragraph/canvasTextEffects.js";
import { drawTextDecoration } from "./paragraph/canvasTextDecoration.js";
import { drawFragmentEmphasis } from "./paragraph/canvasEmphasis.js";
import {
  drawFloatingImagesForParagraph,
  drawImageFragment,
} from "./paragraph/canvasInlineImage.js";

// Tab-leader helpers (local — only used by drawTextFragment).
import {
  resolveTabLeader,
  drawTabLeader,
} from "./paragraph/canvasTabLeaders.js";

export {
  applyCanvasTextFeatureHints,
  resolveCanvasFontFamily,
  resolveCanvasTextRenderMetrics,
  resolveCanvasRunPaintStyle,
} from "./canvasFontResolution.js";
export { resolveFragmentPaintBounds } from "./paragraph/canvasRunBackground.js";
export { drawFloatingImagesForParagraph };

// ---------------------------------------------------------------------------
// Logging (unchanged behaviour, scoped here so it only applies to paragraph)
// ---------------------------------------------------------------------------
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
}): void {
  if (loggedCanvasFontKeys.size >= MAX_CANVAS_FONT_LOGS) return;
  const key = [
    options.requestedFamily ?? "",
    options.metricFamily,
    options.fontSize,
    options.bold,
    options.italic,
  ].join("|");
  if (loggedCanvasFontKeys.has(key)) return;
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

// ---------------------------------------------------------------------------
// drawTextFragment — character-level text run, dispatches to text effects
// ---------------------------------------------------------------------------
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
): void {
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

  const flushSegment = (): void => {
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

    if (segmentLeft === null) segmentLeft = slot.left;
    segmentText += renderedChar;
  }

  flushSegment();
}

// ---------------------------------------------------------------------------
// drawParagraph — main export: iterates lines/fragments and dispatches
// ---------------------------------------------------------------------------
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
): void {
  for (const line of lines) {
    const slotByOffset = new Map<number, (typeof line.slots)[number]>();
    for (const slot of line.slots) {
      slotByOffset.set(slot.offset, slot);
    }
    const baselineY = originY + line.top + line.height * TEXT_BASELINE_RATIO;
    const paragraphStyle = resolveEffectiveParagraphStyle(
      paragraph.style,
      state.document.styles,
    );
    const textAlignment = paragraphStyle.textAlignment;

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
      if (styles.hidden) continue;

      const fontSize = styles.fontSize ?? DEFAULT_FONT_SIZE_PX;
      const metricFamily = resolveMetricCompatibleFamily(
        styles.fontFamily ?? "Calibri",
      );
      const { font, renderMetrics } = resolveCanvasRunPaintStyle(styles);
      ctx.save();
      ctx.font = font;
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
          baselineY +
            renderMetrics.baselineOffset +
            resolveTextAlignmentBaselineOffset(
              textAlignment,
              fontSize,
              line.height,
            ),
        );
        if (styles.reflection) {
          drawFragmentReflection(
            ctx,
            fragment,
            slotByOffset,
            styles,
            originX,
            baselineY +
              renderMetrics.baselineOffset +
              resolveTextAlignmentBaselineOffset(
                textAlignment,
                fontSize,
                line.height,
              ),
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

    // Automatic hyphenation: render-only trailing hyphen.
    if (line.trailingHyphen) {
      const lastFragment = [...line.fragments]
        .reverse()
        .find((f): boolean | "" => f.text && !f.image && !f.textBox);
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
        line.slots.find((slot): boolean => slot.offset === line.endOffset) ??
        lastSlot;
      if (markSlot) {
        ctx.save();
        ctx.font = "400 13px Calibri";
        ctx.fillStyle = "#9ca3af";
        const y = originY + line.top + line.height * TEXT_BASELINE_RATIO;
        ctx.fillText("¶", originX + markSlot.left + 2, y);
        ctx.restore();
      }
    }
  }
}

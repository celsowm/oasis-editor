import type {
  EditorLayoutLine,
  EditorParagraphNode,
  EditorState,
} from "../../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
  resolveImageSrc,
} from "../../core/model.js";
import {
  normalizeFamily,
  resolveMetricCompatibleFamily,
} from "../../export/pdf/fonts/officeFontAssets.js";
import { createEditorLogger } from "../../utils/logger.js";
import { getCachedCanvasImage } from "./canvasImageCache.js";
import { resolveListPrefix } from "./listNumbering.js";
import {
  isDoubleUnderlineStyle,
  isWavyUnderlineStyle,
  type UnderlineStyle,
  underlineStyleDashArray,
  underlineStyleLineWidthPx,
} from "../../core/textStyleMappings.js";

const PX_PER_POINT = 96 / 72;
const canvasTextLogger = createEditorLogger("canvas-text");
const loggedCanvasFontKeys = new Set<string>();
const MAX_CANVAS_FONT_LOGS = 40;

function quoteFontFamily(family: string): string {
  return /[\s,]/.test(family) ? `"${family.replace(/"/g, '\\"')}"` : family;
}

function resolveCanvasFontFamily(
  fontFamily: string | null | undefined,
): string {
  const requested = normalizeFamily(fontFamily ?? "Calibri");
  const metric = resolveMetricCompatibleFamily(fontFamily ?? "Calibri");
  const families =
    requested.toLowerCase() === metric.toLowerCase()
      ? [metric]
      : [requested, metric];
  const generic = /serif/i.test(fontFamily ?? "") ? "serif" : "sans-serif";
  return [...families.map(quoteFontFamily), generic].join(", ");
}

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
    ctx.setLineDash([1, 3]);
  } else if (leader === "hyphen") {
    ctx.setLineDash([5, 3]);
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

export function resolveCanvasTextRenderMetrics(
  styles:
    | {
        superscript?: boolean;
        subscript?: boolean;
        smallCaps?: boolean;
        baselineShift?: number | null;
      }
    | undefined,
  fontSize: number,
) {
  const explicitBaselineShift = (styles?.baselineShift ?? 0) * PX_PER_POINT;
  if (styles?.smallCaps) {
    return {
      fontSize: fontSize * 0.8,
      baselineOffset: -explicitBaselineShift,
    };
  }
  if (styles?.superscript) {
    return {
      fontSize: fontSize * 0.75,
      baselineOffset: -fontSize * 0.35 - explicitBaselineShift,
    };
  }
  if (styles?.subscript) {
    return {
      fontSize: fontSize * 0.75,
      baselineOffset: fontSize * 0.2 - explicitBaselineShift,
    };
  }
  return {
    fontSize,
    baselineOffset: -explicitBaselineShift,
  };
}

export function drawParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  state: EditorState,
  originX: number,
  originY: number,
  onUpdate: () => void,
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
      ctx.save();
      ctx.font = "400 14.6667px Calibri";
      ctx.fillStyle = "#000000";
      const first = line.slots[0];
      const left = first ? Math.max(0, first.left - 24) : 0;
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
      const fontSize = styles.fontSize ?? 14.6667;
      const metricFamily = resolveMetricCompatibleFamily(
        styles.fontFamily ?? "Calibri",
      );
      const fontFamily = resolveCanvasFontFamily(styles.fontFamily);
      const fontWeight = styles.bold ? "700" : "400";
      const fontStyle = styles.italic ? "italic" : "normal";
      const renderMetrics = resolveCanvasTextRenderMetrics(styles, fontSize);
      ctx.save();
      ctx.font = `${fontStyle} ${fontWeight} ${renderMetrics.fontSize}px ${fontFamily}`;
      logCanvasFontUse({
        requestedFamily: styles.fontFamily,
        metricFamily,
        cssFont: ctx.font,
        fontSize: renderMetrics.fontSize,
        bold: Boolean(styles.bold),
        italic: Boolean(styles.italic),
        sample: fragment.text.slice(0, 80),
      });
      ctx.fillStyle = styles.color ?? "#000000";
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
      if (fragment.image) {
        const slot = slotByOffset.get(fragment.startOffset);
        if (slot) {
          const src = resolveImageSrc(state.document, fragment.image.src);
          const img = getCachedCanvasImage(src, onUpdate);
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(
              img,
              originX + slot.left,
              originY + line.top + line.height - fragment.image.height,
              fragment.image.width,
              fragment.image.height,
            );
          }
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
      ctx.restore();
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

function drawFragmentHighlight(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
) {
  const slots = fragment.chars
    .map((char) =>
      line.slots.find((slot) => slot.offset === char.paragraphOffset),
    )
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  if (slots.length === 0) return;
  const left = slots[0]!.left;
  const right = slots[slots.length - 1]!.left + 8;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = color;
  ctx.fillRect(
    originX + left,
    originY + line.top + 2,
    Math.max(0, right - left),
    Math.max(2, line.height - 4),
  );
  ctx.restore();
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
    drawScaledText(ctx, segmentText, originX + segmentLeft, baselineY, scale);
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
      drawScaledText(ctx, renderedChar, originX + slot.left, baselineY, scale);
      continue;
    }

    if (segmentLeft === null) {
      segmentLeft = slot.left;
    }
    segmentText += renderedChar;
  }

  flushSegment();
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
  const slots = fragment.chars
    .map((char) =>
      line.slots.find((slot) => slot.offset === char.paragraphOffset),
    )
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  if (slots.length === 0) return;
  const left = slots[0]!.left;
  const right = slots[slots.length - 1]!.left + 8;
  const y =
    kind === "underline"
      ? originY + line.top + line.height - 2
      : kind === "doubleStrike"
        ? originY + line.top + line.height * 0.5
        : originY + line.top + line.height * 0.52;
  const x1 = originX + left;
  const x2 = originX + right;
  ctx.save();
  ctx.strokeStyle = underlineColor || (ctx.fillStyle as string);

  if (kind === "underline") {
    drawUnderlineWithStyle(ctx, x1, x2, y, underlineStyle);
  } else if (kind === "doubleStrike") {
    const offset = 1.3;
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.moveTo(x1, y - offset);
    ctx.lineTo(x2, y - offset);
    ctx.moveTo(x1, y + offset);
    ctx.lineTo(x2, y + offset);
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
    const offset = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y - offset);
    ctx.lineTo(x2, y - offset);
    ctx.moveTo(x1, y + offset);
    ctx.lineTo(x2, y + offset);
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
  const amplitude = 1.5;
  const wavelength = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  for (let x = x1; x <= x2; x += 1) {
    const dy = Math.sin(((x - x1) / wavelength) * Math.PI) * amplitude;
    ctx.lineTo(x, y + dy);
  }
  ctx.stroke();
}

import type {
  EditorNamedStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import { resolveEffectiveParagraphStyle } from "../../core/model.js";
import { PX_PER_POINT } from "./constants.js";
import type { MeasuredChar } from "./types.js";

const DEFAULT_TAB_STOP_POINTS = 36;

function measureTabAlignedTextWidth(
  tabOffset: number,
  measuredChars: MeasuredChar[],
  stopAtDecimal = false,
): number {
  let width = 0;
  for (const char of measuredChars) {
    if (char.offset <= tabOffset) {
      continue;
    }
    if (char.char === "\t" || char.char === "\n") {
      break;
    }
    if (stopAtDecimal && (char.char === "." || char.char === ",")) {
      break;
    }
    width += char.width;
  }
  return width;
}

export function resolveTabAdvancePx(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  defaultTabStop: number | undefined,
  lineStartInset: number,
  lineWidth: number,
  tabOffset: number,
  measuredChars: MeasuredChar[],
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const currentLeft = lineStartInset + lineWidth;
  const tabOrigin = lineStartInset;
  const explicitStops = (paragraphStyle.tabs ?? [])
    .filter((tab) => tab.type !== "clear" && Number.isFinite(tab.position))
    .map((tab) => ({
      ...tab,
      positionPx: tabOrigin + tab.position * PX_PER_POINT,
    }))
    .filter((tab) => tab.positionPx > currentLeft + 0.01)
    .sort((a, b) => a.positionPx - b.positionPx);
  const explicitStop = explicitStops[0];
  const nextStop =
    explicitStop?.positionPx ??
    tabOrigin +
      Math.ceil(
        (currentLeft - tabOrigin + 0.01) /
          ((defaultTabStop ?? DEFAULT_TAB_STOP_POINTS) * PX_PER_POINT),
      ) *
        ((defaultTabStop ?? DEFAULT_TAB_STOP_POINTS) * PX_PER_POINT);
  let alignmentAdjustment = 0;
  if (explicitStop?.type === "right" || explicitStop?.type === "center") {
    const followingWidth = measureTabAlignedTextWidth(tabOffset, measuredChars);
    alignmentAdjustment =
      explicitStop.type === "center" ? followingWidth / 2 : followingWidth;
  } else if (explicitStop?.type === "decimal") {
    alignmentAdjustment = measureTabAlignedTextWidth(
      tabOffset,
      measuredChars,
      true,
    );
  }
  return Math.max(1, nextStop - currentLeft - alignmentAdjustment);
}

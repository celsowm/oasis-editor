import type { EditorDropCap } from "@/core/model.js";
import type { FloatingExclusionRect } from "./floatingObjects.js";
import { measureCharacterWidth } from "@/ui/textMeasurement/characterWidth.js";

/** Synthetic run id used for the drop-cap exclusion rect. */
export const DROP_CAP_EXCLUSION_RUN_ID = "dropcap";

/** Horizontal gap (px) between the cap glyph and the wrapping body text. */
const DROP_CAP_GUTTER_PX = 4;

/**
 * Advance width (px) of the cap glyph(s) at their own font size, used to size
 * the exclusion the body text wraps around.
 */
export function measureDropCapWidth(dropCap: EditorDropCap): number {
  const fontSize = dropCap.style?.fontSize ?? 0;
  let width = 0;
  for (const char of dropCap.text) {
    width += measureCharacterWidth(char, dropCap.style, fontSize);
  }
  return width;
}

/**
 * Build the exclusion rectangle that the wrapping paragraph's lines avoid so
 * body text flows to the right of the drop cap. Reuses the floating-object
 * exclusion model: `wrap: "square"` shortens every line the rect overlaps.
 *
 * Coordinates are paragraph-local (x/y relative to the paragraph's text box):
 * a "drop" cap sits at the left edge (x = 0); a "margin" cap sits in the left
 * margin (x = -width).
 */
export function resolveDropCapExclusion(options: {
  dropCap: EditorDropCap;
  bodyLineHeight: number;
}): FloatingExclusionRect | null {
  const { dropCap, bodyLineHeight } = options;
  const glyphWidth = measureDropCapWidth(dropCap);
  if (glyphWidth <= 0 || bodyLineHeight <= 0) {
    return null;
  }

  const width = glyphWidth + DROP_CAP_GUTTER_PX;
  return {
    x: dropCap.type === "margin" ? -width : 0,
    y: 0,
    width,
    height: dropCap.lines * bodyLineHeight,
    wrap: "square",
    sourceRunId: DROP_CAP_EXCLUSION_RUN_ID,
  };
}

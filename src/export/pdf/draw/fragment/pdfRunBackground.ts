import type {
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorTextStyle,
} from "@/core/model.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { DEFAULT_FONT_SIZE_PX, pxToPt } from "@/export/pdf/units.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import { resolveFragmentBounds } from "../fragmentGeometry.js";

export function fragmentRectPt(
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  styles: Required<EditorTextStyle>,
  originX: number,
  originY: number,
  yOffset: number,
  heightShrink: number,
): { x: number; y: number; width: number; height: number } | null {
  const bounds = resolveFragmentBounds(
    line,
    fragment,
    styles.fontSize ?? DEFAULT_FONT_SIZE_PX,
  );
  if (!bounds) return null;
  return {
    x: pxToPt(originX + bounds.left),
    y: pxToPt(originY + line.top + yOffset),
    width: pxToPt(Math.max(0, bounds.right - bounds.left)),
    height: pxToPt(Math.max(2, line.height - heightShrink)),
  };
}

export function drawFragmentHighlight(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  if (!styles.highlight) return;
  const rect = fragmentRectPt(line, fragment, styles, originX, originY, 2, 4);
  if (!rect) return;
  writer.drawRect(pageIndex, { ...rect, fill: styles.highlight });
}

export function drawFragmentShading(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  if (!styles.shading) return;
  const rect = fragmentRectPt(line, fragment, styles, originX, originY, 2, 4);
  if (!rect) return;
  writer.drawRect(pageIndex, { ...rect, fill: styles.shading });
}

export function drawFragmentBorder(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  const border = styles.textBorder;
  if (!border || border.type === "none" || border.width <= 0) return;
  const rect = fragmentRectPt(line, fragment, styles, originX, originY, 1, 2);
  if (!rect) return;
  writer.drawRect(pageIndex, {
    ...rect,
    stroke: border.color,
    lineWidth: pxToPt(Math.max(0.5, border.width * PX_PER_POINT)),
  });
}

import type {
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorTextStyle,
} from "@/core/model.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { DEFAULT_FONT_SIZE_PX, pxToPt } from "@/export/pdf/units.js";
import { resolveFragmentBounds } from "../fragmentGeometry.js";
import { resolveGradientAxis } from "@/core/gradientAxis.js";

// Registers an axial gradient for a `w14:textFill` gradient run.
// Returns the shading resource name, or undefined for solid/absent fills.
export function resolveGradientShadingName(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): string | undefined {
  const fill = styles.textFill;
  if (!fill || fill.type !== "gradient" || fill.stops.length < 2)
    return undefined;

  const bounds = resolveFragmentBounds(
    line,
    fragment,
    styles.fontSize ?? DEFAULT_FONT_SIZE_PX,
  );
  if (!bounds) return undefined;

  const x0px = originX + bounds.left;
  const x1px = originX + bounds.right;
  const y0px = originY + line.top;
  const y1px = originY + line.top + line.height;
  const axis = resolveGradientAxis(x0px, y0px, x1px, y1px, fill.angle ?? 0);

  return (
    writer.registerAxialGradient(pageIndex, {
      x0: pxToPt(axis.x0),
      y0: pxToPt(axis.y0),
      x1: pxToPt(axis.x1),
      y1: pxToPt(axis.y1),
      stops: fill.stops.map((stop): { offset: number; color: string; } => ({
        offset: stop.position,
        color: stop.color,
      })),
    }) ?? undefined
  );
}

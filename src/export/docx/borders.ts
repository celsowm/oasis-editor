import type { EditorBorderStyle } from "@/core/model.js";
import { normalizeDocxColor } from "./xmlUtils.js";

/**
 * Serializes a concrete border into the attribute string that follows a border
 * edge element name, e.g. the `w:val="single" w:sz="8" .../>` part of
 * `<w:top w:val="single" .../>`. Shared by table-cell borders (`w:tcBorders`)
 * and paragraph borders (`w:pBdr`).
 *
 * `w:sz` is in eighths of a point. A `none`/zero-width border becomes `nil`.
 */
export function serializeDocxBorderAttrs(
  border: EditorBorderStyle,
  colorFallback = "000000",
): string {
  if (border.type === "none" || border.width <= 0) {
    return 'w:val="nil"/>';
  }
  const val =
    border.type === "dotted"
      ? "dotted"
      : border.type === "dashed"
        ? "dashed"
        : "single";
  const size = Math.max(1, Math.round(border.width * 8));
  return `w:val="${val}" w:sz="${size}" w:space="0" w:color="${normalizeDocxColor(
    border.color,
    colorFallback,
  )}"/>`;
}

interface EditorBoxBorders {
  borderTop?: EditorBorderStyle | null;
  borderRight?: EditorBorderStyle | null;
  borderBottom?: EditorBorderStyle | null;
  borderLeft?: EditorBorderStyle | null;
}

/**
 * Serializes a `w:pBdr` element for the defined paragraph border edges. Returns
 * an empty string when no edge is set so callers can skip it. Unlike table
 * cells (which always emit all four edges with defaults), paragraph borders only
 * emit the edges that are actually present.
 */
export function serializeParagraphBorders(style: EditorBoxBorders): string {
  const edges: Array<[string, EditorBorderStyle | null | undefined]> = [
    ["top", style.borderTop],
    ["left", style.borderLeft],
    ["bottom", style.borderBottom],
    ["right", style.borderRight],
  ];
  const parts = edges
    .filter((entry): entry is [string, EditorBorderStyle] => entry[1] != null)
    .map(([name, border]): string => `<w:${name} ${serializeDocxBorderAttrs(border)}`);
  return parts.length > 0 ? `<w:pBdr>${parts.join("")}</w:pBdr>` : "";
}

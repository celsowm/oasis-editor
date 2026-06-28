import type {
  EditorTableConditionalType,
  EditorTableStyle,
} from "./model.js";

/**
 * Maps OOXML `w:cnfStyle` attribute names to EditorTableConditionalType keys.
 * Shared by import (parsing `w:cnfStyle`) and export (serializing `w:cnfStyle`).
 * The order matches the 12-bit legacy bitmask in `w:val`.
 */
export const TABLE_CONDITIONAL_FLAG_ATTRIBUTES = [
  ["firstRow", "firstRow"],
  ["lastRow", "lastRow"],
  ["firstColumn", "firstCol"],
  ["lastColumn", "lastCol"],
  ["oddVBand", "band1Vert"],
  ["evenVBand", "band2Vert"],
  ["oddHBand", "band1Horz"],
  ["evenHBand", "band2Horz"],
  ["firstRowFirstColumn", "nwCell"],
  ["firstRowLastColumn", "neCell"],
  ["lastRowFirstColumn", "swCell"],
  ["lastRowLastColumn", "seCell"],
] as const satisfies ReadonlyArray<[string, EditorTableConditionalType]>;

/**
 * Maps OOXML `w:tblBorders` element names to EditorTableStyle borders keys.
 * Shared by export paths that serialize table-level borders.
 */
export const TABLE_BORDER_EDGE_KEYS = [
  ["top", "borderTop"],
  ["left", "borderLeft"],
  ["bottom", "borderBottom"],
  ["right", "borderRight"],
  ["insideH", "borderInsideH"],
  ["insideV", "borderInsideV"],
] as const satisfies ReadonlyArray<
  [string, keyof NonNullable<EditorTableStyle["borders"]>]
>;

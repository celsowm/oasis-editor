/**
 * Outline geometry for DrawingML preset shapes (`a:prstGeom/@prst`), expressed
 * as backend-agnostic path segments so the canvas renderer and the PDF exporter
 * paint identical shapes. Coordinates are in a top-left origin coordinate space
 * (px on canvas, pt in the PDF exporter — the segments are affine in the input
 * rectangle, so either unit works).
 */
export type { PresetPathSegment } from "./presetGeometry/types.js";
export {
  SUPPORTED_PRESET_GEOMETRIES,
  isPresetGeometrySupported,
} from "./presetGeometry/catalog.js";
export { getPresetPathSegments } from "./presetGeometry/dispatcher.js";

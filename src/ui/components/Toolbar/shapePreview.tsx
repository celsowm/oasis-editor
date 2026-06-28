import type { JSX } from "solid-js";
import { getPresetPathSegments } from "@/layoutProjection/presetGeometry.js";
import { STROKE_ONLY_PRESETS } from "./shapeCatalog.js";

/** Thumbnail geometry box (unitless; the SVG scales it to the tile). */
const PREVIEW_W = 22;
const PREVIEW_H = 22;
/** Padding inside the box so strokes are not clipped at the edges. */
const PREVIEW_PAD = 2;

function n(value: number): string {
  // Compact, locale-independent number formatting for SVG path data.
  return Number(value.toFixed(2)).toString();
}

/**
 * Builds an SVG path `d` string for a preset by reusing the same
 * backend-agnostic geometry the canvas/PDF renderers use
 * ({@link getPresetPathSegments}). `move→M`, `line→L`, `cubic→C`, `close→Z`.
 */
export function presetToSvgPath(
  preset: string,
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const parts: string[] = [];
  for (const segment of getPresetPathSegments(preset, x, y, width, height)) {
    switch (segment.type) {
      case "move":
        parts.push(`M${n(segment.x)} ${n(segment.y)}`);
        break;
      case "line":
        parts.push(`L${n(segment.x)} ${n(segment.y)}`);
        break;
      case "cubic":
        parts.push(
          `C${n(segment.x1)} ${n(segment.y1)} ${n(segment.x2)} ${n(
            segment.y2,
          )} ${n(segment.x)} ${n(segment.y)}`,
        );
        break;
      case "close":
        parts.push("Z");
        break;
    }
  }
  return parts.join(" ");
}

/**
 * Small monochrome outline preview of a DrawingML preset shape, stroked with
 * `currentColor` so it adapts to light/dark themes. Lines and connectors are
 * drawn without a fill ({@link STROKE_ONLY_PRESETS}).
 */
export function ShapeThumbnail(props: { preset: string }): JSX.Element {
  const d = (): string =>
    presetToSvgPath(
      props.preset,
      PREVIEW_PAD,
      PREVIEW_PAD,
      PREVIEW_W - PREVIEW_PAD * 2,
      PREVIEW_H - PREVIEW_PAD * 2,
    );
  const strokeOnly = (): boolean => STROKE_ONLY_PRESETS.has(props.preset);
  return (
    <svg
      class="oasis-editor-shape-thumb"
      viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
      width={PREVIEW_W}
      height={PREVIEW_H}
      aria-hidden="true"
    >
      <path
        d={d()}
        fill={strokeOnly() ? "none" : "currentColor"}
        fill-opacity={strokeOnly() ? undefined : "0.18"}
        stroke="currentColor"
        stroke-width="1"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  );
}

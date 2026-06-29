/**
 * Owns the writer's axial-gradient shadings (PDF Type 2 shading dictionaries):
 * registration and serialization to Shading + Function indirect objects. The
 * content stream registers a gradient (already flipped to PDF bottom-left space)
 * and references it by name with the `sh` operator inside a glyph clip; the
 * serializer emits the objects and the per-page `/Shading` resource map.
 *
 * Scope: axial (linear) gradients with opaque RGB stops. Per-stop alpha and
 * radial/`gradFill` variants are out of scope (DrawingML text gradients are
 * linear); the colour ramp is a stitching of linear (Type 2, N=1) sub-functions
 * across the stop offsets, matching the canvas painter's linear RGB interpolation.
 */
import type { AddPdfObject } from "./pdfTypes.js";
import { colorToRgb, formatNumber } from "./pdfPrimitives.js";

/** A gradient already resolved to PDF bottom-left-origin point coordinates. */
export interface PdfAxialShadingSpec {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Stops sorted by offset, each `{ offset: 0–1, color: hex }`. */
  stops: Array<{ offset: number; color: string }>;
}

export class PdfShadingTable {
  private readonly shadings: Array<{
    name: string;
    spec: PdfAxialShadingSpec;
  }> = [];

  /** Registers a gradient (PDF space) and returns its `/Shading` resource name. */
  register(spec: PdfAxialShadingSpec): string {
    const name = `Sh${this.shadings.length + 1}`;
    this.shadings.push({ name, spec });
    return name;
  }

  /** Emits each gradient's Function + Shading objects, keyed by resource name. */
  buildShadingObjects(addObject: AddPdfObject): Map<string, number> {
    const ids = new Map<string, number>();
    for (const { name, spec } of this.shadings) {
      ids.set(name, this.addShadingObject(spec, addObject));
    }
    return ids;
  }

  private addShadingObject(
    spec: PdfAxialShadingSpec,
    addObject: AddPdfObject,
  ): number {
    const stops = normalizeStops(spec.stops);
    const functionObjectId = addObject(buildFunctionObject(stops));
    return addObject(
      [
        "<< /ShadingType 2",
        "/ColorSpace /DeviceRGB",
        `/Coords [${[spec.x0, spec.y0, spec.x1, spec.y1]
          .map(formatNumber)
          .join(" ")}]`,
        "/Domain [0 1]",
        `/Function ${functionObjectId} 0 R`,
        "/Extend [true true]",
        ">>",
      ].join("\n"),
    );
  }
}

interface ResolvedStop {
  offset: number;
  rgb: [number, number, number];
}

/**
 * Sorts, clamps and de-duplicates the stops, and guarantees endpoints at 0 and 1
 * (the shading `Domain` is `[0 1]`) by clamping the outermost stops outward, so
 * the stitching function always covers the whole domain.
 */
function normalizeStops(
  stops: Array<{ offset: number; color: string }>,
): ResolvedStop[] {
  const resolved: ResolvedStop[] = stops
    .map((stop): { offset: number; rgb: [number, number, number] } => ({
      offset: Math.min(1, Math.max(0, stop.offset)),
      rgb: colorToRgb(stop.color, [0, 0, 0]),
    }))
    .sort((a, b): number => a.offset - b.offset);

  if (resolved.length === 0) {
    return [
      { offset: 0, rgb: [0, 0, 0] },
      { offset: 1, rgb: [0, 0, 0] },
    ];
  }
  if (resolved.length === 1) {
    return [
      { offset: 0, rgb: resolved[0]!.rgb },
      { offset: 1, rgb: resolved[0]!.rgb },
    ];
  }
  // Pin the extremes to the domain edges so no flat gap is left uncovered.
  resolved[0]!.offset = 0;
  resolved[resolved.length - 1]!.offset = 1;
  // A Type 3 function's Bounds must be strictly increasing inside (0, 1); nudge
  // any duplicate/degenerate interior offsets so a malformed stop list can't
  // produce an invalid shading.
  for (let i = 1; i < resolved.length - 1; i += 1) {
    const min = resolved[i - 1]!.offset + 1e-4;
    if (resolved[i]!.offset <= min) {
      resolved[i]!.offset = Math.min(1 - 1e-4, min);
    }
  }
  return resolved;
}

/** A PDF Type 2 (exponential, N=1 ⇒ linear) function interpolating two colors. */
function exponentialFunction(
  c0: [number, number, number],
  c1: [number, number, number],
): string {
  return [
    "<< /FunctionType 2",
    "/Domain [0 1]",
    `/C0 [${c0.map(formatNumber).join(" ")}]`,
    `/C1 [${c1.map(formatNumber).join(" ")}]`,
    "/N 1",
    ">>",
  ].join("\n");
}

/**
 * Builds the colour function object body. Two stops collapse to a single Type 2
 * function; more stops stitch one Type 2 per segment with a Type 3 function whose
 * `Bounds` are the interior offsets and whose `Encode` maps each segment to [0 1].
 */
function buildFunctionObject(stops: ResolvedStop[]): string {
  if (stops.length === 2) {
    return exponentialFunction(stops[0]!.rgb, stops[1]!.rgb);
  }
  const subFunctions: string[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    subFunctions.push(exponentialFunction(stops[i]!.rgb, stops[i + 1]!.rgb));
  }
  const bounds = stops
    .slice(1, -1)
    .map((stop): string => formatNumber(stop.offset));
  const encode = stops
    .slice(0, -1)
    .map((): "0 1" => "0 1")
    .join(" ");
  return [
    "<< /FunctionType 3",
    "/Domain [0 1]",
    `/Functions [${subFunctions.join(" ")}]`,
    `/Bounds [${bounds.join(" ")}]`,
    `/Encode [${encode}]`,
    ">>",
  ].join("\n");
}

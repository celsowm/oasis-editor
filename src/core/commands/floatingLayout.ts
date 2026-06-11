import type { EditorImageFloatingLayout } from "../model.js";

/**
 * The text-wrapping presets exposed by the Word-style "Layout Options" popup.
 * Maps onto the `floating` field of an image/text-box run:
 * - `inline`       → no `floating` (the object flows in line with text)
 * - `square`/`tight`/`through`/`topAndBottom` → `floating.wrap` of the same name
 * - `behind`       → `wrap:"none"`, `behindDoc:true` (behind the text)
 * - `front`        → `wrap:"none"`, `behindDoc:false` (in front of the text)
 */
export type WrapPreset =
  | "inline"
  | "square"
  | "tight"
  | "through"
  | "topAndBottom"
  | "behind"
  | "front";

/**
 * Default floating layout seeded the first time an inline object becomes
 * floating: anchored to the column/paragraph at zero offset, allowing overlap.
 */
function defaultFloating(): EditorImageFloatingLayout {
  return {
    type: "floating",
    allowOverlap: true,
    positionH: { relativeFrom: "column", offset: 0 },
    positionV: { relativeFrom: "paragraph", offset: 0 },
  };
}

/**
 * Builds the `floating` patch for a given preset, preserving the previous
 * position/offset/distance settings. Returns `undefined` for `inline`, which
 * callers should use to delete the `floating` field entirely.
 */
export function wrapPresetToFloating(
  prev: EditorImageFloatingLayout | undefined,
  preset: WrapPreset,
): EditorImageFloatingLayout | undefined {
  if (preset === "inline") {
    return undefined;
  }

  const base: EditorImageFloatingLayout = {
    ...(prev ?? defaultFloating()),
    type: "floating",
  };

  switch (preset) {
    case "square":
    case "tight":
    case "through":
    case "topAndBottom":
      return { ...base, wrap: preset, behindDoc: false };
    case "behind":
      return { ...base, wrap: "none", behindDoc: true };
    case "front":
      return { ...base, wrap: "none", behindDoc: false };
  }
}

/**
 * Reflects the current `floating` state back to a preset so the popup can mark
 * the active option.
 */
export function floatingToWrapPreset(
  floating: EditorImageFloatingLayout | undefined,
): WrapPreset {
  if (!floating) {
    return "inline";
  }
  if (floating.behindDoc) {
    return "behind";
  }
  if (!floating.wrap || floating.wrap === "none") {
    return "front";
  }
  return floating.wrap;
}

/**
 * Toggles "Move with text" (anchored to the paragraph) vs "Fix position on
 * page" (anchored to the page) by patching the vertical anchor's `relativeFrom`.
 */
export function applyMoveWithText(
  floating: EditorImageFloatingLayout,
  fixed: boolean,
): EditorImageFloatingLayout {
  return {
    ...floating,
    positionV: {
      ...(floating.positionV ?? {}),
      relativeFrom: fixed ? "page" : "paragraph",
    },
  };
}

/** True when the object is pinned to the page rather than moving with text. */
export function isFloatingFixedPosition(
  floating: EditorImageFloatingLayout | undefined,
): boolean {
  return floating?.positionV?.relativeFrom === "page";
}

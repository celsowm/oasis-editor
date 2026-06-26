import { describe, expect, it } from "vitest";

import { resolveOpenTypeFeatureTags } from "@/core/textStyleMappings.js";
import type { EditorTextStyle } from "@/core/model.js";

function style(partial: Partial<EditorTextStyle>): EditorTextStyle {
  return partial as EditorTextStyle;
}

describe("resolveOpenTypeFeatureTags", () => {
  it("returns no tags for a plain run", () => {
    expect(resolveOpenTypeFeatureTags(style({}))).toEqual([]);
  });

  it("maps ligature modes to their OpenType tags", () => {
    expect(
      resolveOpenTypeFeatureTags(style({ ligatures: "standard" })),
    ).toEqual(["liga"]);
    expect(
      resolveOpenTypeFeatureTags(style({ ligatures: "contextual" })),
    ).toEqual(["calt"]);
    expect(
      resolveOpenTypeFeatureTags(style({ ligatures: "historical" })),
    ).toEqual(["hlig"]);
    expect(
      resolveOpenTypeFeatureTags(style({ ligatures: "standardContextual" })),
    ).toEqual(["calt", "liga"]);
  });

  it("maps figure style and spacing", () => {
    expect(resolveOpenTypeFeatureTags(style({ numberForm: "lining" }))).toEqual(
      ["lnum"],
    );
    expect(
      resolveOpenTypeFeatureTags(style({ numberForm: "oldStyle" })),
    ).toEqual(["onum"]);
    expect(
      resolveOpenTypeFeatureTags(style({ numberSpacing: "proportional" })),
    ).toEqual(["pnum"]);
    expect(
      resolveOpenTypeFeatureTags(style({ numberSpacing: "tabular" })),
    ).toEqual(["tnum"]);
  });

  it("maps stylistic sets to zero-padded ssNN tags", () => {
    expect(resolveOpenTypeFeatureTags(style({ stylisticSet: 1 }))).toEqual([
      "ss01",
    ]);
    expect(resolveOpenTypeFeatureTags(style({ stylisticSet: 20 }))).toEqual([
      "ss20",
    ]);
    // Out-of-range sets are ignored.
    expect(resolveOpenTypeFeatureTags(style({ stylisticSet: 0 }))).toEqual([]);
    expect(resolveOpenTypeFeatureTags(style({ stylisticSet: 21 }))).toEqual([]);
  });

  it("maps contextual alternates and de-duplicates with standardContextual", () => {
    expect(
      resolveOpenTypeFeatureTags(style({ contextualAlternates: true })),
    ).toEqual(["calt"]);
    expect(
      resolveOpenTypeFeatureTags(
        style({ ligatures: "standardContextual", contextualAlternates: true }),
      ),
    ).toEqual(["calt", "liga"]);
  });

  it("adds kern only when a font size meeting the threshold is supplied", () => {
    const kerned = style({ kerningThreshold: 8 });
    // No size → substitution tags only, never kern.
    expect(resolveOpenTypeFeatureTags(kerned)).toEqual([]);
    // Size below the threshold → kerning stays off.
    expect(resolveOpenTypeFeatureTags(kerned, 6)).toEqual([]);
    // Size at/above the threshold → kern turns on.
    expect(resolveOpenTypeFeatureTags(kerned, 8)).toEqual(["kern"]);
    expect(resolveOpenTypeFeatureTags(kerned, 12)).toEqual(["kern"]);
    // Without a threshold, a size never introduces kern.
    expect(resolveOpenTypeFeatureTags(style({}), 12)).toEqual([]);
  });

  it("merges kern into the sorted GSUB tag list", () => {
    expect(
      resolveOpenTypeFeatureTags(
        style({ ligatures: "standard", kerningThreshold: 1 }),
        12,
      ),
    ).toEqual(["kern", "liga"]);
  });

  it("returns a sorted, de-duplicated tag list", () => {
    const tags = resolveOpenTypeFeatureTags(
      style({
        ligatures: "standard",
        numberForm: "oldStyle",
        numberSpacing: "tabular",
        stylisticSet: 2,
        contextualAlternates: true,
      }),
    );
    expect(tags).toEqual([...tags].sort());
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toEqual(["calt", "liga", "onum", "ss02", "tnum"]);
  });
});

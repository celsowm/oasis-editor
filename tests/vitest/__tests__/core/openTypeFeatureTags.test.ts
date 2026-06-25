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

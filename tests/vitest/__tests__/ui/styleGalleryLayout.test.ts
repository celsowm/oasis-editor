import { describe, expect, it } from "vitest";
import { styleGallerySlots, visibleGalleryStyles } from "@/ui/components/Toolbar/styleGalleryLayout.js";
import type { ToolbarDocumentStyle } from "@/ui/components/Toolbar/schema/items.js";

const quick: ToolbarDocumentStyle[] = ["normal", "heading1", "heading2", "heading3", "caption"].map(
  (id) => ({ id, name: id, type: "paragraph" }),
);
const ids = (styles: ToolbarDocumentStyle[]) => styles.map((style) => style.id);

describe("responsive style gallery layout", () => {
  it("keeps a flexible card around the 106px boundary", () => {
    expect([0, 60, 79.9, 80, 105, 105.9, 106, 211.9, 212].map(styleGallerySlots))
      .toEqual([1, 1, 1, 1, 1, 1, 1, 1, 2]);
  });
  it("follows the active style while preserving canonical order", () => {
    expect(ids(visibleGalleryStyles(quick, quick, "heading3", 1))).toEqual(["heading3"]);
    expect(ids(visibleGalleryStyles(quick, quick, "heading3", 2))).toEqual(["heading2", "heading3"]);
    expect(ids(visibleGalleryStyles(quick, quick, "normal", 2))).toEqual(["normal", "heading1"]);
    expect(ids(quick)).toEqual(["normal", "heading1", "heading2", "heading3", "caption"]);
  });
  it("handles filtered styles and unknown IDs without inventing a style", () => {
    const hidden: ToolbarDocumentStyle = { id: "custom", name: "Custom", type: "character", semiHidden: true };
    expect(visibleGalleryStyles(quick, [...quick, hidden], "custom", 1)).toEqual([hidden]);
    expect(ids(visibleGalleryStyles(quick, quick, "unknown", 1))).toEqual(["normal"]);
    expect(visibleGalleryStyles(quick, quick, "", 0)).toEqual([]);
  });
});

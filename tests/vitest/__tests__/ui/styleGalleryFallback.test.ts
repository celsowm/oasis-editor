import { describe, expect, it } from "vitest";
import type { ToolbarDocumentStyle } from "@/ui/components/Toolbar/schema/items.js";
import { compactStyleFallback } from "@/ui/components/Toolbar/styleGalleryFallback.js";

const style = (
  id: string,
  name: string,
  extra: Partial<ToolbarDocumentStyle> = {},
): ToolbarDocumentStyle => ({ id, name, ...extra }) as ToolbarDocumentStyle;

const quick = [
  style("normal", "Normal"),
  style("heading1", "Heading 1"),
  style("Caption", "Caption"),
];
const all = [
  ...quick,
  style("header", "Header", { semiHidden: true }),
  style("footnoteReference", "Footnote Reference", {
    type: "character",
    semiHidden: true,
  }),
];

describe("compactStyleFallback", () => {
  it("needs no fallback when the active style is already a quick style", () => {
    expect(compactStyleFallback("heading1", quick, all)).toBeNull();
  });

  it("needs no fallback for an empty active id", () => {
    expect(compactStyleFallback("", quick, all)).toBeNull();
  });

  it("supplies the style's name when it is filtered out of the quick list", () => {
    expect(compactStyleFallback("header", quick, all)).toEqual({
      id: "header",
      name: "Header",
    });
  });

  it("also covers character styles absent from the quick list", () => {
    expect(compactStyleFallback("footnoteReference", quick, all)).toEqual({
      id: "footnoteReference",
      name: "Footnote Reference",
    });
  });

  it("falls back to the raw id for a style unknown to the document", () => {
    expect(compactStyleFallback("mystery", quick, all)).toEqual({
      id: "mystery",
      name: "mystery",
    });
  });
});

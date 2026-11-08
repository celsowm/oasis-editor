import { describe, expect, it } from "vitest";
import { createEditorStyledRun } from "@/core/editorState.js";
import {
  resolvePdfRunText,
  type PdfParagraphTextContext,
} from "@/export/pdf/layout/layoutParagraph.js";

function fieldRun(type: "PAGE" | "NUMPAGES", format?: string) {
  const base = createEditorStyledRun("1");
  const field = format
    ? { type, format }
    : { type };
  return { ...base, kind: "field" as const, field };
}

function context(pageNumber: number, totalPages: number): PdfParagraphTextContext {
  return {
    pageNumber,
    totalPages,
    measurer: {} as PdfParagraphTextContext["measurer"],
  };
}

describe("resolvePdfRunText page-number format", () => {
  it("renders the page number in the field's format", () => {
    const ctx = context(7, 12);
    expect(
      resolvePdfRunText(fieldRun("PAGE", "roman") as never, ctx),
    ).toBe("vii");
    expect(
      resolvePdfRunText(fieldRun("PAGE", "ROMAN") as never, ctx),
    ).toBe("VII");
    expect(
      resolvePdfRunText(fieldRun("PAGE", "alphabetic") as never, ctx),
    ).toBe("g");
    expect(
      resolvePdfRunText(fieldRun("PAGE", "Ordinal") as never, ctx),
    ).toBe("7th");
  });

  it("defaults to decimal when no format is present", () => {
    const ctx = context(7, 12);
    expect(resolvePdfRunText(fieldRun("PAGE") as never, ctx)).toBe("7");
  });

  it("applies the format to NUMPAGES too", () => {
    const ctx = context(7, 12);
    expect(resolvePdfRunText(fieldRun("NUMPAGES", "roman") as never, ctx)).toBe(
      "xii",
    );
  });
});

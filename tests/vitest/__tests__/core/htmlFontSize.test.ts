// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { absoluteCssLengthToPx } from "@/core/html/absoluteCssLength.js";
import { importHtmlToEditorDocument } from "@/import/html/importHtmlToEditorDocument.js";
import { exportEditorDocumentToHtml } from "@/export/html/exportEditorDocumentToHtml.js";
import { insertHtmlAtSelection } from "@/core/commands/html.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentParagraphs } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

describe("HTML absolute font sizes", () => {
  it.each([
    ["12pt", 16],
    ["10.5pt", 14],
    ["16px", 16],
    ["1pc", 16],
    [".25in", 24],
    ["2.54cm", 96],
    ["25.4mm", 96],
    ["101.6Q", 96],
    ["1e1pt", 40 / 3],
  ] as const)("converts %s to CSS pixels", (css, pixels) => {
    expect(absoluteCssLengthToPx(css)).toBeCloseTo(pixels, 10);
  });

  it.each([
    "1em",
    "120%",
    "large",
    "calc(12pt + 2px)",
    "12",
    "-1pt",
    "1e999px",
    "12pt junk",
  ])("does not invent a host-dependent or invalid size for %s", (css) => {
    expect(absoluteCssLengthToPx(css)).toBeUndefined();
  });

  it("retains paragraph size, nested overrides, links and HTML reimport", () => {
    const doc = importHtmlToEditorDocument(
      '<p style="font-size:12pt">before <a href="https://example.com" style="font-size:10.5pt">link</a> after</p>',
    );
    const runs = getDocumentParagraphs(doc)[0]!.runs;
    expect(runs.map((r) => r.styles?.fontSize)).toEqual([16, 14, 16]);
    expect(runs[1]!.styles?.link).toBe("https://example.com");
    const restored = importHtmlToEditorDocument(
      exportEditorDocumentToHtml(doc),
    );
    expect(
      getDocumentParagraphs(restored)[0]!.runs.map((r) => r.styles?.fontSize),
    ).toEqual([16, 14, 16]);
  });

  it("pastes point sizes without changing the surrounding text formatting", () => {
    const doc = importHtmlToEditorDocument(
      '<p style="font-size:16px">before after</p>',
    );
    const state = createEditorStateFromDocument(doc, { offset: 7 });
    const after = insertHtmlAtSelection(
      state,
      '<span style="font-size:18pt">inserted</span>',
    );
    const runs = getDocumentParagraphs(after.document)[0]!.runs;
    expect(runs.map((r) => r.text).join("")).toBe("before insertedafter");
    expect(runs.find((r) => r.text === "inserted")?.styles?.fontSize).toBe(24);
    expect(
      runs
        .filter((r) => r.text !== "inserted")
        .every((r) => r.styles?.fontSize === 16),
    ).toBe(true);
  });

  it("retains imported point sizes through DOCX export and reimport", async () => {
    const doc = importHtmlToEditorDocument(
      '<p><span style="font-size:10.5pt">small</span><span style="font-size:18pt">large</span></p>',
    );
    const bytes = await exportEditorDocumentToDocx(doc);
    const restored = await importDocxToEditorDocument(bytes);
    const runs = getDocumentParagraphs(restored)[0]!.runs;
    expect(
      runs.find((run) => run.text === "small")?.styles?.fontSize,
    ).toBeCloseTo(14);
    expect(
      runs.find((run) => run.text === "large")?.styles?.fontSize,
    ).toBeCloseTo(24);
  });
});

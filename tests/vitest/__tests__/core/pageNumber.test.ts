import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getRunField,
  paragraphOffsetToPosition,
  type EditorBlockNode,
  type EditorParagraphNode,
  type EditorTextRun,
} from "@/core/model.js";
import { editHeaderFooter } from "@/core/commands/headerFooter.js";
import {
  insertPageNumberField,
  isInHeaderOrFooter,
  isPageNumberFieldRun,
  placePageNumber,
} from "@/core/commands/pageNumber.js";
import { getActiveZone } from "@/core/model/editingZones.js";

function paragraphAt(document: {
  sections?: Array<{ blocks: EditorBlockNode[] }>;
}): EditorParagraphNode {
  return document.sections![0]!.blocks[0] as EditorParagraphNode;
}

function bodyRuns(document: {
  sections?: Array<{ blocks: EditorBlockNode[] }>;
}): EditorTextRun[] {
  return paragraphAt(document).runs;
}

function fixture() {
  const paragraph = createEditorParagraph("Body");
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    state: {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 2),
        focus: paragraphOffsetToPosition(paragraph, 2),
      },
    },
  };
}

function fieldType(run: EditorTextRun): string | undefined {
  return getRunField(run)?.type;
}

describe("page-number field insertion", () => {
  it("inserts a bare PAGE field at the caret in the body", () => {
    const { state } = fixture();
    const result = insertPageNumberField(state, "page");
    const runs = bodyRuns(result.document);
    // Caret at offset 2 in "Body" → "Bo" + PAGE field + "dy".
    expect(runs[runs.length - 2]).toMatchObject({ kind: "field", text: "1" });
    expect(fieldType(runs[runs.length - 2]!)).toBe("PAGE");
    expect(runs[0]!.text).toBe("Bo");
    expect(runs[runs.length - 1]!.text).toBe("dy");
  });

  it("applies the requested number format to the field run", () => {
    const { state } = fixture();
    const result = insertPageNumberField(state, "page", "ROMAN");
    const runs = bodyRuns(result.document);
    const fieldRun = runs.find((run) => fieldType(run) === "PAGE");
    expect(getRunField(fieldRun!)?.format).toBe("ROMAN");
    // Decimal (default) leaves no explicit format on the run.
    const plain = insertPageNumberField(state, "page");
    const plainRun = bodyRuns(plain.document).find(
      (run) => fieldType(run) === "PAGE",
    );
    expect(getRunField(plainRun!)?.format).toBeUndefined();
  });

  it("inserts the Page X of Y combination as PAGE + NUMPAGES with literals", () => {
    const { state } = fixture();
    const result = insertPageNumberField(state, "xOfY");
    const runs = bodyRuns(result.document);
    const texts = runs.map((run) => run.text);
    expect(texts.some((t) => t.includes("Page "))).toBe(true);
    expect(texts.some((t) => t.includes(" of "))).toBe(true);
    const pageIndex = runs.findIndex((run) => fieldType(run) === "PAGE");
    const numpagesIndex = runs.findIndex((run) => fieldType(run) === "NUMPAGES");
    expect(pageIndex).toBeGreaterThan(-1);
    expect(numpagesIndex).toBeGreaterThan(pageIndex);
  });

  it("works inside an active header zone", () => {
    const { state } = fixture();
    const inHeader = editHeaderFooter(state, "header");
    expect(isInHeaderOrFooter(inHeader)).toBe(true);
    const result = insertPageNumberField(inHeader, "xOfY");
    const runs = (
      result.document.sections![0]!.header![0] as EditorParagraphNode
    ).runs;
    expect(runs.some(isPageNumberFieldRun)).toBe(true);
    expect(runs.some((run) => run.text === "Page ")).toBe(true);
    // The caret returns to the main body only after an explicit exit.
    expect(isInHeaderOrFooter(result)).toBe(true);
  });

  it("replaces the current selection", () => {
    const { state } = fixture();
    const first = paragraphAt(state.document);
    const selected = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(first, 0),
        focus: paragraphOffsetToPosition(first, 4),
      },
    };
    const result = insertPageNumberField(selected, "page");
    const runs = bodyRuns(result.document);
    // The whole selection was replaced, so only the PAGE field run remains.
    expect(runs.map((run) => run.text)).toEqual(["1"]);
    expect(runs.some(isPageNumberFieldRun)).toBe(true);
  });

  it("not in a header/footer zone for a plain body state", () => {
    const { state } = fixture();
    expect(isInHeaderOrFooter(state)).toBe(false);
  });
});

describe("page-number placement (top/bottom/current)", () => {
  it("places the page number in the footer story, aligned (default center)", () => {
    const { state } = fixture();
    const result = placePageNumber(state, "bottom");
    const story = (
      result.document.sections![0]!.footer as EditorBlockNode[]
    ).map((block) => block as EditorParagraphNode);
    expect(story).toHaveLength(1);
    expect(story[0]!.style).toMatchObject({ styleId: "footer", align: "center" });
    expect(story[0]!.runs.some(isPageNumberFieldRun)).toBe(true);
    expect(getActiveZone(result)).toBe("footer");
  });

  it("places the page number in the header story with the requested alignment", () => {
    const { state } = fixture();
    const result = placePageNumber(state, "top", {
      kind: "xOfY",
      align: "right",
      format: "ROMAN",
    });
    const story = (
      result.document.sections![0]!.header as EditorBlockNode[]
    ).map((block) => block as EditorParagraphNode);
    expect(story[0]!.style).toMatchObject({ styleId: "header", align: "right" });
    // X-of-Y shape produces both field kinds.
    const fieldTypes = story[0]!.runs
      .map(fieldType)
      .filter((t): t is string => Boolean(t));
    expect(fieldTypes).toEqual(["PAGE", "NUMPAGES"]);
    // Format is carried onto the field runs.
    expect(getRunField(story[0]!.runs[story[0]!.runs.findIndex(isPageNumberFieldRun)])?.format).toBe("ROMAN");
    expect(getActiveZone(result)).toBe("header");
  });

  it("overwrites an existing default footer story", () => {
    const { state } = fixture();
    const withExisting = placePageNumber(state, "bottom", { align: "left" });
    const rePlaced = placePageNumber(withExisting, "bottom", { align: "right" });
    const story = (
      rePlaced.document.sections![0]!.footer as EditorBlockNode[]
    ).map((block) => block as EditorParagraphNode);
    expect(story).toHaveLength(1);
    expect(story[0]!.style).toMatchObject({ align: "right" });
  });

  it("keeps the caret in the body for the current position", () => {
    const { state } = fixture();
    const result = placePageNumber(state, "current");
    expect(getActiveZone(result)).toBe("main");
    // The PAGE field was inserted at the body caret ("Bo" + field + "dy").
    const runs = bodyRuns(result.document);
    expect(runs.some(isPageNumberFieldRun)).toBe(true);
  });

  it("places an xOfY combination in the footer story", () => {
    const { state } = fixture();
    const result = placePageNumber(state, "bottom", { kind: "xOfY" });
    const story = (
      result.document.sections![0]!.footer as EditorBlockNode[]
    ).map((block) => block as EditorParagraphNode);
    const texts = story[0]!.runs.map((run) => run.text);
    expect(texts.some((t) => t.includes("Page "))).toBe(true);
    expect(texts.some((t) => t.includes(" of "))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getRunField,
  type EditorParagraphNode,
} from "@/core/model.js";
import {
  findBookmarkByName,
  insertCrossReference,
  isCrossReferenceFieldRun,
  resolveBookmarkReferenceText,
} from "@/core/commands/crossReference.js";
import { createBookmark } from "@/core/commands/bookmark.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

/** Create a document with a bookmarked paragraph, caret at the body start. */
function fixture(bookmarkName = "Target") {
  const paragraph = createEditorParagraph("Hello world");
  const base = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  const withBookmark = createBookmark(base, bookmarkName);
  return { state: withBookmark, paragraph };
}

function bodyParagraph(state: unknown): EditorParagraphNode {
  return (state as {
    document: { sections: Array<{ blocks: EditorParagraphNode[] }> };
  }).document.sections[0].blocks[0];
}

describe("insertCrossReference", () => {
  it("inserts a REF field at the caret pointing at the bookmark", () => {
    const { state } = fixture("Target");
    const result = insertCrossReference(state, { type: "REF", bookmark: "Target" });
    const runs = bodyParagraph(result).runs;
    const refRun = runs.find(isCrossReferenceFieldRun)!;
    expect(refRun).toBeDefined();
    expect(runs[0]).toBe(refRun);
    expect(getRunField(refRun as never)).toEqual({
      type: "REF",
      bookmark: "Target",
    });
  });

  it("inserts a PAGEREF field at the caret", () => {
    const { state } = fixture("Target");
    const result = insertCrossReference(state, {
      type: "PAGEREF",
      bookmark: "Target",
    });
    const refRun = bodyParagraph(result).runs.find(isCrossReferenceFieldRun)!;
    expect(getRunField(refRun as never)).toEqual({
      type: "PAGEREF",
      bookmark: "Target",
    });
  });

  it("is a no-op when the target bookmark is unknown (broken reference)", () => {
    const { state } = fixture("Target");
    expect(
      insertCrossReference(state, { type: "REF", bookmark: "Missing" }),
    ).toBe(state);
  });

  it("resolves a bookmark's referenced text through the bookmarked range", () => {
    const { state } = fixture("Target");
    const bookmark = findBookmarkByName(state, "Target")!;
    expect(bookmark).toBeDefined();
    // Zero-width bookmark at the caret (offset 0) yields the start slice.
    expect(resolveBookmarkReferenceText(state, bookmark)).toBe("");
  });

  it("resolves the text of a selected (zero-width at start) bookmark", () => {
    const paragraph = createEditorParagraph("Alpha beta gamma");
    const base = createEditorStateFromDocument(
      createEditorDocument([paragraph]),
    );
    const bookmarked = createBookmark(base, "T");
    const bookmark = findBookmarkByName(bookmarked, "T")!;
    // The created bookmark is a single point at offset 0.
    expect(bookmark.end).toBeUndefined();
    expect(resolveBookmarkReferenceText(bookmarked, bookmark)).toBe("");
  });
});

describe("cross-reference DOCX round-trip", () => {
  it("exports a REF field and re-imports it with its bookmark target", async () => {
    const body = createEditorParagraph("Body");
    const base = createEditorStateFromDocument(
      createEditorDocument([body]),
    );
    const withBookmark = createBookmark(base, "Referenced");
    const authored = insertCrossReference(withBookmark, {
      type: "REF",
      bookmark: "Referenced",
    });

    const buffer = await exportEditorDocumentToDocx(authored.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain('w:instr=" REF Referenced \\h "');

    const imported = await importDocxToEditorDocument(buffer);
    const importedRun = (
      imported.sections![0]!.blocks![0] as EditorParagraphNode
    ).runs.find(isCrossReferenceFieldRun);
    expect(importedRun).toBeDefined();
    expect(getRunField(importedRun!)).toEqual({
      type: "REF",
      bookmark: "Referenced",
    });
  });

  it("round-trips a PAGEREF field", async () => {
    const body = createEditorParagraph("Body");
    const base = createEditorStateFromDocument(
      createEditorDocument([body]),
    );
    const withBookmark = createBookmark(base, "Referenced");
    const authored = insertCrossReference(withBookmark, {
      type: "PAGEREF",
      bookmark: "Referenced",
    });

    const buffer = await exportEditorDocumentToDocx(authored.document);
    const imported = await importDocxToEditorDocument(buffer);
    const importedRun = (
      imported.sections![0]!.blocks![0] as EditorParagraphNode
    ).runs.find(isCrossReferenceFieldRun);
    expect(getRunField(importedRun!)).toEqual({
      type: "PAGEREF",
      bookmark: "Referenced",
    });
  });
});

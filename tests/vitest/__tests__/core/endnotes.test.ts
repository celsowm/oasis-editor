import { describe, it, expect } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
} from "@/core/editorState.js";
import {
  collectEndnoteReferences,
  listReferencedEndnotes,
  renumberEndnotes,
} from "@/core/endnotes.js";
import type {
  EditorDocument,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";

function refRun(endnoteId: string): EditorTextRun {
  return {
    id: `run:${endnoteId}`,
    text: "?",
    styles: { superscript: true },
    endnoteReference: { endnoteId },
  };
}

function buildDoc(refOrder: string[], itemIds: string[]): EditorDocument {
  const paragraph: EditorParagraphNode = {
    id: "paragraph:body",
    type: "paragraph",
    runs: [{ id: "run:lead", text: "body" }, ...refOrder.map(refRun)],
  };
  const doc = createEditorDocument([paragraph]);
  doc.endnotes = {
    items: Object.fromEntries(
      itemIds.map((id) => [id, { id, blocks: [createEditorParagraph(id)] }]),
    ),
  };
  return doc;
}

describe("core/endnotes", () => {
  it("materializes inline markers in reading order", () => {
    const doc = buildDoc(
      ["endnote:b", "endnote:a"],
      ["endnote:a", "endnote:b"],
    );
    const next = renumberEndnotes(doc);
    const refs = collectEndnoteReferences(next);
    // First referenced run (endnote:b) becomes "1", second ("endnote:a") "2".
    expect(refs.map((r) => r.run.text)).toEqual(["1", "2"]);
  });

  it("prunes endnote bodies that are no longer referenced", () => {
    const doc = buildDoc(["endnote:a"], ["endnote:a", "endnote:orphan"]);
    const next = renumberEndnotes(doc);
    expect(Object.keys(next.endnotes!.items)).toEqual(["endnote:a"]);
  });

  it("indexes referenced endnotes uniquely in document order", () => {
    const doc = buildDoc(
      ["endnote:a", "endnote:a", "endnote:b"],
      ["endnote:a", "endnote:b"],
    );
    const list = listReferencedEndnotes(doc);
    expect(list.map((e) => e.endnoteId)).toEqual(["endnote:a", "endnote:b"]);
    expect(list.map((e) => e.index)).toEqual([1, 2]);
  });
});

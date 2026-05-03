import { describe, it, expect } from "vitest";
import { findMatchesInDocument } from "../../app/services/FindReplaceService.js";
import { createEditor2Document, createEditor2Paragraph } from "../../core/editorState.js";

describe("FindReplaceService", () => {
  it("should find simple text matches", () => {
    const doc = createEditor2Document([
      createEditor2Paragraph("Hello world"),
      createEditor2Paragraph("Another world"),
    ]);

    const matches = findMatchesInDocument(doc, "world");
    expect(matches).toHaveLength(2);
    expect(matches[0].paragraphIndex).toBe(0);
    expect(matches[0].anchor.offset).toBe(6);
    expect(matches[0].focus.offset).toBe(11);
    expect(matches[1].paragraphIndex).toBe(1);
    expect(matches[1].anchor.offset).toBe(8);
    expect(matches[1].focus.offset).toBe(13);
  });

  it("should handle case-insensitivity by default", () => {
    const doc = createEditor2Document([createEditor2Paragraph("Hello World")]);
    const matches = findMatchesInDocument(doc, "world");
    expect(matches).toHaveLength(1);
  });

  it("should support case-sensitive search", () => {
    const doc = createEditor2Document([createEditor2Paragraph("Hello World")]);
    const matches = findMatchesInDocument(doc, "world", { matchCase: true });
    expect(matches).toHaveLength(0);

    const matches2 = findMatchesInDocument(doc, "World", { matchCase: true });
    expect(matches2).toHaveLength(1);
  });

  it("should support whole-word matching", () => {
    const doc = createEditor2Document([createEditor2Paragraph("HelloWorld World")]);
    const matchesAll = findMatchesInDocument(doc, "World");
    expect(matchesAll).toHaveLength(2);

    const matchesWhole = findMatchesInDocument(doc, "World", { wholeWord: true });
    expect(matchesWhole).toHaveLength(1);
    expect(matchesWhole[0].anchor.offset).toBe(11);
  });

  it("should escape special regex characters in search term", () => {
    const doc = createEditor2Document([createEditor2Paragraph("Search for [brackets]?")]);
    const matches = findMatchesInDocument(doc, "[brackets]?");
    expect(matches).toHaveLength(1);
    expect(matches[0].anchor.offset).toBe(11);
  });

  it("should return empty array for empty search term", () => {
    const doc = createEditor2Document([createEditor2Paragraph("Some text")]);
    expect(findMatchesInDocument(doc, "")).toHaveLength(0);
  });

  it("should find matches across multiple runs", () => {
    // Note: getParagraphText aggregates runs, so this should work naturally
    const doc = createEditor2Document([
      {
        id: "p1",
        type: "paragraph",
        runs: [
          { id: "r1", text: "Hello " },
          { id: "r2", text: "world" },
        ],
      },
    ]);

    const matches = findMatchesInDocument(doc, "world");
    expect(matches).toHaveLength(1);
    expect(matches[0].anchor.offset).toBe(6);
    expect(matches[0].focus.offset).toBe(11);
  });
});

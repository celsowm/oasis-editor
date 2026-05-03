import { describe, it, expect } from "vitest";
import { findMatchesInDocument } from "../../../app/services/FindReplaceService.js";
import { createEditor2Document, createEditor2Paragraph } from "../../../core/editorState.js";
import { positionToParagraphOffset } from "../../../core/model.js";

describe("FindReplaceService", () => {
  it("should find simple text matches", () => {
    const doc = createEditor2Document([
      createEditor2Paragraph("Hello world"),
      createEditor2Paragraph("Another world"),
    ]);

    const matches = findMatchesInDocument(doc, "world");
    expect(matches).toHaveLength(2);
    expect(matches[0].paragraphIndex).toBe(0);
    
    const p1 = doc.blocks[0] as any;
    expect(positionToParagraphOffset(p1, matches[0].anchor)).toBe(6);
    expect(positionToParagraphOffset(p1, matches[0].focus)).toBe(11);

    const p2 = doc.blocks[1] as any;
    expect(positionToParagraphOffset(p2, matches[1].anchor)).toBe(8);
    expect(positionToParagraphOffset(p2, matches[1].focus)).toBe(13);
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
    const p = doc.blocks[0] as any;
    expect(positionToParagraphOffset(p, matchesWhole[0].anchor)).toBe(11);
  });

  it("should escape special regex characters in search term", () => {
    const doc = createEditor2Document([createEditor2Paragraph("Search for [brackets]?")]);
    const matches = findMatchesInDocument(doc, "[brackets]?");
    expect(matches).toHaveLength(1);
    const p = doc.blocks[0] as any;
    expect(positionToParagraphOffset(p, matches[0].anchor)).toBe(11);
  });

  it("should return empty array for empty search term", () => {
    const doc = createEditor2Document([createEditor2Paragraph("Some text")]);
    expect(findMatchesInDocument(doc, "")).toHaveLength(0);
  });

  it("should find matches across multiple runs", () => {
    const p1 = {
      id: "p1",
      type: "paragraph" as const,
      runs: [
        { id: "r1", text: "Hello " },
        { id: "r2", text: "world" },
      ],
    };
    const doc = createEditor2Document([p1]);

    const matches = findMatchesInDocument(doc, "world");
    expect(matches).toHaveLength(1);
    
    expect(positionToParagraphOffset(p1, matches[0].anchor)).toBe(6);
    expect(positionToParagraphOffset(p1, matches[0].focus)).toBe(11);
    
    // Also verify the positions themselves are correct relative to runs
    expect(matches[0].anchor.runId).toBe("r1"); // Because offset 6 is the end of r1
    expect(matches[0].anchor.offset).toBe(6);
    expect(matches[0].focus.runId).toBe("r2");
    expect(matches[0].focus.offset).toBe(5);
  });
});

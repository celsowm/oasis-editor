import { describe, it, expect } from "vitest";
import { createEditorDocument, createEditorParagraph, getDocumentWordCount, getDocumentCharacterCount } from "../../core/editorState.js";

describe("Document Stats", () => {
  it("should count characters correctly", () => {
    const doc = createEditorDocument([
      createEditorParagraph("Hello"),
      createEditorParagraph("world"),
    ]);
    expect(getDocumentCharacterCount(doc)).toBe(10);
  });

  it("should count words correctly", () => {
    const doc = createEditorDocument([
      createEditorParagraph("Hello world"),
      createEditorParagraph("This is a test."),
    ]);
    // Hello, world, This, is, a, test
    expect(getDocumentWordCount(doc)).toBe(6);
  });

  it("should handle empty documents", () => {
    const doc = createEditorDocument([createEditorParagraph("")]);
    expect(getDocumentWordCount(doc)).toBe(0);
    expect(getDocumentCharacterCount(doc)).toBe(0);
  });

  it("should handle multiple spaces and punctuation", () => {
    const doc = createEditorDocument([
      createEditorParagraph("  Multiple   spaces  "),
      createEditorParagraph("Punctuation! (Should: work?)"),
    ]);
    // Multiple, spaces, Punctuation, Should, work
    expect(getDocumentWordCount(doc)).toBe(5);
  });

  it("should count CJK characters as words (basic support)", () => {
    // Current naive implementation splits by punctuation/whitespace.
    // In some CJK contexts, words aren't space-separated.
    // But for now, we follow the roadmap's "reasonable fallback".
    const doc = createEditorDocument([createEditorParagraph("你好世界")]);
    // Without spaces, our naive regex will treat "你好世界" as 1 word.
    // Real CJK word counting is complex; we'll stick to the current logic unless specified.
    expect(getDocumentWordCount(doc)).toBe(1);
  });
});

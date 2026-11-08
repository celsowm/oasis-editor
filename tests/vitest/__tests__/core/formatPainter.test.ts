import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";
import {
  applyCapturedFormatPainter,
  captureFormatPainter,
  resolveFormatPainterTarget,
} from "@/core/commands/formatPainter.js";

function documentWithTwoParagraphs() {
  const source = createEditorParagraphFromRuns([
    { text: "Source", styles: {
      bold: true, italic: true, color: "#aa0000",
      fontFamily: "Source Serif", fontSize: 22,
      link: "https://source.invalid",
    }},
  ]);
  source.style = { align: "right", spacingAfter: 20 };
  source.list = { kind: "bullet", level: 0 };
  const destination = createEditorParagraphFromRuns([
    { text: "Target", styles: {
      fontFamily: "Destination Sans", color: "#112233",
      link: "https://destination.invalid",
    }},
    { text: " rest", styles: { fontFamily: "Destination Sans" }},
  ]);
  destination.style = { align: "left", spacingAfter: 5 };
  const state = createEditorStateFromDocument(
    createEditorDocument([source, destination]),
  );
  return { state, source, destination };
}

function select(
  state: EditorState,
  paragraph: EditorParagraphNode,
  start: number,
  end: number,
): EditorState {
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, start),
      focus: paragraphOffsetToPosition(paragraph, end),
    },
  };
}

describe("Format Painter immutable core", () => {
  it("captures inline formatting and excludes semantic hyperlinks", () => {
    const { state, source } = documentWithTwoParagraphs();
    const captured = captureFormatPainter(select(state, source, 1, 4));
    expect(captured?.text).toMatchObject({
      bold: true,
      italic: true,
      fontFamily: "Source Serif",
      fontSize: 22,
    });
    expect(captured?.text?.link).toBeUndefined();
    expect(captured?.copyParagraph).toBe(false);
  });

  it("copies paragraph formatting only for whole-paragraph or caret sources", () => {
    const { state, source } = documentWithTwoParagraphs();
    const partial = captureFormatPainter(select(state, source, 0, 3));
    expect(partial?.copyParagraph).toBe(false);
    const whole = captureFormatPainter(select(state, source, 0, 6));
    expect(whole?.copyParagraph).toBe(true);
    expect(whole?.paragraph?.align).toBe("right");
    expect(whole?.list?.kind).toBe("bullet");
    const caret = captureFormatPainter(select(state, source, 3, 3));
    expect(caret?.copyParagraph).toBe(true);
  });

  it("applies source character formatting to only the selected destination range", () => {
    const { state, source, destination } = documentWithTwoParagraphs();
    const captured = captureFormatPainter(select(state, source, 1, 4))!;
    const target = select(state, destination, 0, 6);
    const next = applyCapturedFormatPainter(target, captured);
    expect(next).not.toBe(target);
    const paragraphs = getDocumentParagraphs(next.document);
    expect(getParagraphText(paragraphs[0]!)).toBe("Source");
    expect(getParagraphText(paragraphs[1]!)).toBe("Target rest");
    const styled = paragraphs[1]!.runs.find((run) => run.text.includes("Target"))!;
    expect(styled.styles).toMatchObject({
      fontFamily: "Source Serif",
      fontSize: 22,
      color: "#aa0000",
      bold: true,
      italic: true,
      link: "https://destination.invalid",
    });
    const unchanged = paragraphs[1]!.runs.find((run) => run.text.includes(" rest"))!;
    expect(unchanged.styles?.fontFamily).toBe("Destination Sans");
    expect(paragraphs[1]?.style?.align).toBe("left");
    expect(next.selection.anchor.paragraphId).toBe(destination.id);
    expect(next.selection.focus.paragraphId).toBe(destination.id);
  });

  it("applies paragraph and list styles only when target paragraphs are fully selected", () => {
    const { state, source, destination } = documentWithTwoParagraphs();
    const captured = captureFormatPainter(select(state, source, 0, 6))!;
    const result = applyCapturedFormatPainter(select(state, destination, 0, 11), captured);
    const painted = getDocumentParagraphs(result.document)[1]!;
    expect(painted.style).toMatchObject({ align: "right", spacingAfter: 20 });
    expect(painted.list?.kind).toBe("bullet");
    expect(getParagraphText(painted)).toBe("Target rest");
  });

  it("does not apply to a collapsed selection without a word target", () => {
    const { state, source, destination } = documentWithTwoParagraphs();
    const captured = captureFormatPainter(select(state, source, 0, 6))!;
    const caret = select(state, destination, 3, 3);
    expect(applyCapturedFormatPainter(caret, captured)).toBe(caret);
  });

  it("resolves a pointer caret to the word beneath it for mouse/touch painting", () => {
    const { state, destination } = documentWithTwoParagraphs();
    const caret = select(state, destination, 3, 3);
    const resolved = resolveFormatPainterTarget(caret, true);
    expect(resolved).not.toBeNull();
    expect(resolved?.selection.anchor.paragraphId).toBe(destination.id);
    expect(resolved?.selection.focus.paragraphId).toBe(destination.id);
    expect(resolveFormatPainterTarget(caret, false)).toBeNull();
  });
});

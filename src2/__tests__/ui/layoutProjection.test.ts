import { describe, expect, it } from "vitest";
import { createEditor2ParagraphFromRuns, resetEditor2Ids } from "../../core/editorState.js";
import {
  projectDocumentLayout,
  measureParagraphLayoutFromRects,
  projectParagraphLayout,
  resolveClosestOffsetInMeasuredLayout,
} from "../../ui/layoutProjection.js";

describe("layoutProjection", () => {
  it("projects a paragraph into run fragments with paragraph offsets", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);

    const layout = projectParagraphLayout(paragraph);

    expect(layout.text).toBe("abcd");
    expect(layout.fragments.map((fragment) => fragment.text)).toEqual(["ab", "cd"]);
    expect(layout.fragments.map((fragment) => fragment.runId)).toEqual(
      paragraph.runs.map((run) => run.id),
    );
    expect(layout.fragments[0]?.chars.map((char) => char.paragraphOffset)).toEqual([0, 1]);
    expect(layout.fragments[1]?.chars.map((char) => char.paragraphOffset)).toEqual([2, 3]);
  });

  it("measures line fragments and slots from wrapped rects", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);

    const layout = measureParagraphLayoutFromRects(paragraph, [
      { left: 10, right: 20, top: 10, bottom: 30, height: 20 },
      { left: 20, right: 30, top: 10, bottom: 30, height: 20 },
      { left: 10, right: 20, top: 40, bottom: 60, height: 20 },
      { left: 20, right: 30, top: 40, bottom: 60, height: 20 },
    ]);

    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0]?.fragments.map((fragment) => fragment.text)).toEqual(["ab"]);
    expect(layout.lines[0]?.slots.map((slot) => slot.offset)).toEqual([0, 1, 2]);
    expect(layout.lines[1]?.fragments.map((fragment) => fragment.text)).toEqual(["cd"]);
    expect(layout.lines[1]?.slots.map((slot) => slot.offset)).toEqual([2, 3, 4]);
  });

  it("resolves the nearest offset from the measured layout itself", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);

    const layout = measureParagraphLayoutFromRects(paragraph, [
      { left: 10, right: 20, top: 10, bottom: 30, height: 20 },
      { left: 20, right: 30, top: 10, bottom: 30, height: 20 },
      { left: 10, right: 20, top: 40, bottom: 60, height: 20 },
      { left: 20, right: 30, top: 40, bottom: 60, height: 20 },
    ]);

    expect(resolveClosestOffsetInMeasuredLayout(layout, 9, 12)).toBe(0);
    expect(resolveClosestOffsetInMeasuredLayout(layout, 28, 12)).toBe(2);
    expect(resolveClosestOffsetInMeasuredLayout(layout, 9, 45)).toBe(2);
    expect(resolveClosestOffsetInMeasuredLayout(layout, 29, 45)).toBe(4);
  });

  it("projects a document into multiple pages when accumulated block height exceeds the page limit", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "a".repeat(240) }]),
      createEditor2ParagraphFromRuns([{ text: "b".repeat(240) }]),
      createEditor2ParagraphFromRuns([{ text: "c".repeat(240) }]),
    ];

    const layout = projectDocumentLayout(paragraphs, 220);

    expect(layout.pages.length).toBeGreaterThan(1);
    expect(layout.pages.flatMap((page) => page.blocks.map((block) => block.paragraphId))).toEqual(
      paragraphs.map((paragraph) => paragraph.id),
    );
  });

  it("prefers measured block heights over estimated ones for page projection", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "short" }]),
      createEditor2ParagraphFromRuns([{ text: "short" }]),
    ];

    const layout = projectDocumentLayout(
      paragraphs,
      120,
      {
        [paragraphs[0]!.id]: 80,
        [paragraphs[1]!.id]: 80,
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks[0]?.estimatedHeight).toBe(80);
    expect(layout.pages[1]?.blocks[0]?.estimatedHeight).toBe(80);
  });

  it("forces a new page when a paragraph has pageBreakBefore", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "alpha" }]),
      createEditor2ParagraphFromRuns([{ text: "beta" }]),
    ];
    paragraphs[1]!.style = { pageBreakBefore: true };

    const layout = projectDocumentLayout(
      paragraphs,
      1000,
      {
        [paragraphs[0]!.id]: 40,
        [paragraphs[1]!.id]: 40,
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks.map((block) => block.paragraphId)).toEqual([paragraphs[0]!.id]);
    expect(layout.pages[1]?.blocks.map((block) => block.paragraphId)).toEqual([paragraphs[1]!.id]);
  });

  it("keeps adjacent paragraphs together when keepWithNext is set", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "lead" }]),
      createEditor2ParagraphFromRuns([{ text: "tail" }]),
      createEditor2ParagraphFromRuns([{ text: "after" }]),
    ];
    paragraphs[0]!.style = { keepWithNext: true };

    const layout = projectDocumentLayout(
      paragraphs,
      100,
      {
        [paragraphs[0]!.id]: 40,
        [paragraphs[1]!.id]: 40,
        [paragraphs[2]!.id]: 40,
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks.map((block) => block.paragraphId)).toEqual([
      paragraphs[0]!.id,
      paragraphs[1]!.id,
    ]);
    expect(layout.pages[1]?.blocks.map((block) => block.paragraphId)).toEqual([paragraphs[2]!.id]);
  });
});

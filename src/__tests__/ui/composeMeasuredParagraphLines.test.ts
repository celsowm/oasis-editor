import { describe, expect, it } from "vitest";
import { createEditorParagraph } from "../../core/editorState.js";
import type { EditorLayoutFragment, EditorLayoutFragmentChar, EditorParagraphNode } from "../../core/model.js";
import { composeMeasuredParagraphLines } from "../../ui/textMeasurement.js";

function createFragments(paragraph: EditorParagraphNode): EditorLayoutFragment[] {
  let paragraphOffset = 0;
  return paragraph.runs.map((run) => {
    const chars: EditorLayoutFragmentChar[] = Array.from(run.text).map((char, index) => ({
      char,
      paragraphOffset: paragraphOffset + index,
      runOffset: index,
    }));
    const fragment: EditorLayoutFragment = {
      paragraphId: paragraph.id,
      runId: run.id,
      startOffset: paragraphOffset,
      endOffset: paragraphOffset + run.text.length,
      text: run.text,
      styles: run.styles ? { ...run.styles } : undefined,
      image: run.image ? { ...run.image } : undefined,
      revision: run.revision ? { ...run.revision } : undefined,
      chars,
    };
    paragraphOffset += run.text.length;
    return fragment;
  });
}

function measure(paragraph: EditorParagraphNode, contentWidth: number) {
  return composeMeasuredParagraphLines({
    paragraph,
    fragments: createFragments(paragraph),
    contentWidth,
    layoutMode: "wordParity",
  });
}

function lineWidth(line: ReturnType<typeof measure>[number]): number {
  const first = line.slots[0]?.left ?? 0;
  const last = line.slots[line.slots.length - 1]?.left ?? first;
  return last - first;
}

function lineStart(line: ReturnType<typeof measure>[number]): number {
  return line.slots[0]?.left ?? 0;
}

describe("composeMeasuredParagraphLines alignment", () => {
  it("keeps left alignment without slot shift", () => {
    const paragraph = createEditorParagraph("left alignment baseline");
    paragraph.style = { align: "left" };
    const lines = measure(paragraph, 600);
    const firstLine = lines[0];
    expect(firstLine).toBeTruthy();
    expect(firstLine?.slots[0]?.left ?? -1).toBe(0);
  });

  it("applies first line indent to the first line start slot", () => {
    const paragraph = createEditorParagraph("first line indent baseline");
    paragraph.style = { align: "left", indentFirstLine: 29 };
    const lines = measure(paragraph, 600);
    expect(lines).toHaveLength(1);
    expect(lineStart(lines[0]!)).toBe(29);
  });

  it("applies base indent to all wrapped lines", () => {
    const paragraph = createEditorParagraph(
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu",
    );
    paragraph.style = { align: "left", indentLeft: 20, indentHanging: 10 };
    const lines = measure(paragraph, 180);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(lineStart(line)).toBe(30);
    }
  });

  it("applies center alignment as half of remaining width", () => {
    const text = "center alignment baseline";
    const paragraphLeft = createEditorParagraph(text);
    paragraphLeft.style = { align: "left" };
    const leftLines = measure(paragraphLeft, 620);

    const paragraphCenter = createEditorParagraph(text);
    paragraphCenter.style = { align: "center" };
    const centerLines = measure(paragraphCenter, 620);

    const expectedShift = (620 - lineWidth(leftLines[0]!)) / 2;
    expect(centerLines[0]!.slots[0]?.left ?? 0).toBeCloseTo(expectedShift, 6);
  });

  it("keeps alignment math correct with first-line indent", () => {
    const text = "center alignment with first line indent";
    const paragraphLeft = createEditorParagraph(text);
    paragraphLeft.style = { align: "left", indentFirstLine: 29 };
    const leftLines = measure(paragraphLeft, 620);

    const paragraphCenter = createEditorParagraph(text);
    paragraphCenter.style = { align: "center", indentFirstLine: 29 };
    const centerLines = measure(paragraphCenter, 620);

    const availableWidth = 620 - 29;
    const expectedShift = (availableWidth - lineWidth(leftLines[0]!)) / 2;
    expect(lineStart(centerLines[0]!)).toBeCloseTo(29 + expectedShift, 6);
  });

  it("applies right alignment as full remaining width", () => {
    const text = "right alignment baseline";
    const paragraphLeft = createEditorParagraph(text);
    paragraphLeft.style = { align: "left" };
    const leftLines = measure(paragraphLeft, 640);

    const paragraphRight = createEditorParagraph(text);
    paragraphRight.style = { align: "right" };
    const rightLines = measure(paragraphRight, 640);

    const expectedShift = 640 - lineWidth(leftLines[0]!);
    expect(rightLines[0]!.slots[0]?.left ?? 0).toBeCloseTo(expectedShift, 6);
  });

  it("distributes justify spacing across spaces", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota";
    const paragraphLeft = createEditorParagraph(text);
    paragraphLeft.style = { align: "left" };
    const leftLines = measure(paragraphLeft, 210);

    const paragraphJustify = createEditorParagraph(text);
    paragraphJustify.style = { align: "justify" };
    const justifiedLines = measure(paragraphJustify, 210);
    expect(justifiedLines.length).toBeGreaterThan(1);

    const leftLine = leftLines[0]!;
    const justifiedLine = justifiedLines[0]!;
    const firstOffset = justifiedLine.startOffset;
    const lineText = text.slice(justifiedLine.startOffset, justifiedLine.endOffset);
    const firstSpaceIndex = lineText.indexOf(" ");
    const secondSpaceIndex = lineText.indexOf(" ", firstSpaceIndex + 1);
    expect(firstSpaceIndex).toBeGreaterThanOrEqual(0);
    expect(secondSpaceIndex).toBeGreaterThan(firstSpaceIndex);

    const firstOffsetAfterFirstSpace = firstOffset + firstSpaceIndex + 1;
    const firstOffsetAfterSecondSpace = firstOffset + secondSpaceIndex + 1;
    const leftAfterFirst = leftLine.slots.find((slot) => slot.offset === firstOffsetAfterFirstSpace)!;
    const leftAfterSecond = leftLine.slots.find((slot) => slot.offset === firstOffsetAfterSecondSpace)!;
    const justifiedAfterFirst = justifiedLine.slots.find(
      (slot) => slot.offset === firstOffsetAfterFirstSpace,
    )!;
    const justifiedAfterSecond = justifiedLine.slots.find(
      (slot) => slot.offset === firstOffsetAfterSecondSpace,
    )!;

    const deltaAfterFirst = justifiedAfterFirst.left - leftAfterFirst.left;
    const deltaAfterSecond = justifiedAfterSecond.left - leftAfterSecond.left;
    expect(deltaAfterFirst).toBeGreaterThan(0);
    expect(deltaAfterSecond).toBeGreaterThan(deltaAfterFirst);
  });

  it("does not justify the last line", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota";
    const paragraphLeft = createEditorParagraph(text);
    paragraphLeft.style = { align: "left" };
    const leftLines = measure(paragraphLeft, 210);

    const paragraphJustify = createEditorParagraph(text);
    paragraphJustify.style = { align: "justify" };
    const justifiedLines = measure(paragraphJustify, 210);
    expect(justifiedLines.length).toBeGreaterThan(1);

    const lastLeftLine = leftLines[leftLines.length - 1]!;
    const lastJustifiedLine = justifiedLines[justifiedLines.length - 1]!;
    expect(lastJustifiedLine.slots.map((slot) => slot.left)).toEqual(
      lastLeftLine.slots.map((slot) => slot.left),
    );
  });

  it("does not justify lines terminated by hard break", () => {
    const text = "alpha beta gamma\ndelta epsilon";
    const paragraphLeft = createEditorParagraph(text);
    paragraphLeft.style = { align: "left" };
    const leftLines = measure(paragraphLeft, 300);

    const paragraphJustify = createEditorParagraph(text);
    paragraphJustify.style = { align: "justify" };
    const justifiedLines = measure(paragraphJustify, 300);
    expect(justifiedLines.length).toBeGreaterThanOrEqual(2);

    expect(justifiedLines[0]!.slots.map((slot) => slot.left)).toEqual(
      leftLines[0]!.slots.map((slot) => slot.left),
    );
  });
});

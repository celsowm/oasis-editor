import { describe, expect, it } from "vitest";
import { createEditorParagraph } from "../../core/editorState.js";
import type {
  EditorLayoutFragment,
  EditorLayoutFragmentChar,
  EditorParagraphNode,
} from "../../core/model.js";
import { composeMeasuredParagraphLines } from "../../ui/textMeasurement.js";
import type { FloatingExclusionRect } from "../../core/engine.js";

function createFragments(
  paragraph: EditorParagraphNode,
): EditorLayoutFragment[] {
  let paragraphOffset = 0;
  return paragraph.runs.map((run) => {
    const chars: EditorLayoutFragmentChar[] = Array.from(run.text).map(
      (char, index) => ({
        char,
        paragraphOffset: paragraphOffset + index,
        runOffset: index,
      }),
    );
    const fragment: EditorLayoutFragment = {
      paragraphId: paragraph.id,
      runId: run.id,
      startOffset: paragraphOffset,
      endOffset: paragraphOffset + run.text.length,
      text: run.text,
      styles: run.styles ? { ...run.styles } : undefined,
      image: run.image ? { ...run.image } : undefined,
      textBox: run.textBox ? { ...run.textBox } : undefined,
      revision: run.revision ? { ...run.revision } : undefined,
      chars,
    };
    paragraphOffset += run.text.length;
    return fragment;
  });
}

function measure(
  paragraph: EditorParagraphNode,
  contentWidth: number,
  defaultTabStop?: number,
) {
  return composeMeasuredParagraphLines({
    paragraph,
    fragments: createFragments(paragraph),
    contentWidth,
    defaultTabStop,
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
  it("honors explicit narrow content widths for table-cell wrapping", () => {
    const paragraph = createEditorParagraph("Linha 1 Col 4");
    const lines = measure(paragraph, 45);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(lineWidth(line)).toBeLessThanOrEqual(45);
    }
  });

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
    expect(lineStart(lines[0])).toBe(10);
    for (let i = 1; i < lines.length; i++) {
      expect(lineStart(lines[i])).toBe(20);
    }
  });

  it("advances tab characters to explicit paragraph tab stops", () => {
    const paragraph = createEditorParagraph("a\tb");
    paragraph.style = {
      tabs: [{ position: 72, type: "left" }],
    };
    const lines = measure(paragraph, 600);
    const line = lines[0]!;
    const afterTab = line.slots.find((slot) => slot.offset === 2);

    expect(afterTab?.left).toBeCloseTo(96, 4);
  });

  it("advances tab characters to the next default stop without explicit tabs", () => {
    const paragraph = createEditorParagraph("a\tb");
    const lines = measure(paragraph, 600);
    const line = lines[0]!;
    const afterTab = line.slots.find((slot) => slot.offset === 2);

    expect(afterTab?.left).toBeCloseTo(48, 4);
  });

  it("uses the document default tab stop when provided", () => {
    const paragraph = createEditorParagraph("a\tb");
    const lines = measure(paragraph, 600, 24);
    const line = lines[0]!;
    const afterTab = line.slots.find((slot) => slot.offset === 2);

    expect(afterTab?.left).toBeCloseTo(32, 4);
  });

  it("right-aligns following text at right tab stops", () => {
    const paragraph = createEditorParagraph("a\tbc");
    paragraph.style = {
      tabs: [{ position: 72, type: "right" }],
    };
    const line = measure(paragraph, 600)[0]!;
    const afterText = line.slots.find((slot) => slot.offset === 4);

    expect(afterText?.left).toBeCloseTo(96, 4);
  });

  it("center-aligns following text around center tab stops", () => {
    const paragraph = createEditorParagraph("a\tbc");
    paragraph.style = {
      tabs: [{ position: 72, type: "center" }],
    };
    const line = measure(paragraph, 600)[0]!;
    const afterTab = line.slots.find((slot) => slot.offset === 2)!;
    const afterText = line.slots.find((slot) => slot.offset === 4)!;

    expect((afterTab.left + afterText.left) / 2).toBeCloseTo(96, 4);
  });

  it("aligns decimal separators at decimal tab stops", () => {
    const paragraph = createEditorParagraph("a\t12.34");
    paragraph.style = {
      tabs: [{ position: 72, type: "decimal" }],
    };
    const line = measure(paragraph, 600)[0]!;
    const decimalSlot = line.slots.find((slot) => slot.offset === 4);

    expect(decimalSlot?.left).toBeCloseTo(96, 4);
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
    const lineText = text.slice(
      justifiedLine.startOffset,
      justifiedLine.endOffset,
    );
    const firstSpaceIndex = lineText.indexOf(" ");
    const secondSpaceIndex = lineText.indexOf(" ", firstSpaceIndex + 1);
    expect(firstSpaceIndex).toBeGreaterThanOrEqual(0);
    expect(secondSpaceIndex).toBeGreaterThan(firstSpaceIndex);

    const firstOffsetAfterFirstSpace = firstOffset + firstSpaceIndex + 1;
    const firstOffsetAfterSecondSpace = firstOffset + secondSpaceIndex + 1;
    const leftAfterFirst = leftLine.slots.find(
      (slot) => slot.offset === firstOffsetAfterFirstSpace,
    )!;
    const leftAfterSecond = leftLine.slots.find(
      (slot) => slot.offset === firstOffsetAfterSecondSpace,
    )!;
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

  it("keeps justify well-behaved in a very narrow column", () => {
    // A long token wider than the column must not break justification: every
    // line should stay within the column and slot positions stay finite and
    // monotonic (no negative gaps, no NaN from dividing by zero spaces).
    const text = "antidisestablishmentarianism a b c de fgh ijkl mnop qrst";
    const contentWidth = 45;
    const paragraph = createEditorParagraph(text);
    paragraph.style = { align: "justify" };
    const lines = measure(paragraph, contentWidth);
    expect(lines.length).toBeGreaterThan(1);

    const contentEdge = (line: ReturnType<typeof measure>[number]) => {
      const first = line.slots[0]!.left;
      for (let i = line.endOffset - 1; i >= line.startOffset; i--) {
        if (text[i] && text[i] !== " ") {
          const trailing =
            line.slots.find((slot) => slot.offset === i + 1) ??
            line.slots.find((slot) => slot.offset === i)!;
          return trailing.left - first;
        }
      }
      return 0;
    };

    for (const line of lines) {
      const lefts = line.slots.map((slot) => slot.left);
      for (const left of lefts) {
        expect(Number.isFinite(left)).toBe(true);
      }
      for (let i = 1; i < lefts.length; i++) {
        expect(lefts[i]!).toBeGreaterThanOrEqual(lefts[i - 1]!);
      }
      // Visible content never spills past the column (sub-pixel tolerance).
      expect(contentEdge(line)).toBeLessThanOrEqual(contentWidth + 0.5);
    }
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

  it("fills interior justified lines to the available width with a first-line indent", () => {
    const text =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega";
    const contentWidth = 300;
    const indentFirstLine = 40;
    const paragraph = createEditorParagraph(text);
    paragraph.style = { align: "justify", indentFirstLine };
    const lines = measure(paragraph, contentWidth);
    expect(lines.length).toBeGreaterThan(2);

    // Content edge of a line, ignoring any trailing whitespace slot.
    const contentEdge = (line: ReturnType<typeof measure>[number]) => {
      const first = line.slots[0]!.left;
      for (let i = line.endOffset - 1; i >= line.startOffset; i--) {
        const char = text[i];
        if (char && char !== " ") {
          const trailing =
            line.slots.find((slot) => slot.offset === i + 1) ??
            line.slots.find((slot) => slot.offset === i)!;
          return trailing.left - first;
        }
      }
      return 0;
    };

    // Every interior (non-last) justified line must fill to its available
    // width — no degenerate short lines from a stale paragraph-wide breaker.
    for (let i = 0; i < lines.length - 1; i++) {
      const availableWidth = contentWidth - (i === 0 ? indentFirstLine : 0);
      expect(contentEdge(lines[i]!)).toBeCloseTo(availableWidth, 4);
    }
  });

  it("expands justified spaces by a constant per-space gap", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota";
    const paragraphLeft = createEditorParagraph(text);
    paragraphLeft.style = { align: "left" };
    const leftLine = measure(paragraphLeft, 210)[0]!;

    const paragraphJustify = createEditorParagraph(text);
    paragraphJustify.style = { align: "justify" };
    const justifiedLines = measure(paragraphJustify, 210);
    expect(justifiedLines.length).toBeGreaterThan(1);
    const justifiedLine = justifiedLines[0]!;

    const lineText = text.slice(
      justifiedLine.startOffset,
      justifiedLine.endOffset,
    );
    const firstSpace = lineText.indexOf(" ");
    const secondSpace = lineText.indexOf(" ", firstSpace + 1);
    const thirdSpace = lineText.indexOf(" ", secondSpace + 1);
    expect(thirdSpace).toBeGreaterThan(secondSpace);

    const shiftAt = (spaceIndexInText: number) => {
      const offset = justifiedLine.startOffset + spaceIndexInText + 1;
      const left = leftLine.slots.find((slot) => slot.offset === offset)!.left;
      const justified = justifiedLine.slots.find(
        (slot) => slot.offset === offset,
      )!.left;
      return justified - left;
    };

    const gap = shiftAt(firstSpace);
    expect(gap).toBeGreaterThan(0);
    expect(shiftAt(secondSpace)).toBeCloseTo(2 * gap, 4);
    expect(shiftAt(thirdSpace)).toBeCloseTo(3 * gap, 4);
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

describe("composeMeasuredParagraphLines inline objects", () => {
  it("grows the line height to fit an inline text box", () => {
    // A single object-replacement char standing in for a 120px-tall text box.
    const paragraph = createEditorParagraph("￼");
    paragraph.runs[0]!.textBox = { width: 200, height: 120, blocks: [] };

    const textLine = measure(createEditorParagraph("plain"), 600)[0]!;
    const lines = measure(paragraph, 600);

    expect(lines).toHaveLength(1);
    expect(lines[0]!.height).toBeGreaterThanOrEqual(120);
    // The grown line must be taller than a normal text line.
    expect(lines[0]!.height).toBeGreaterThan(textLine.height);
  });

  it("does not grow the line for a floating text box (out of flow)", () => {
    const paragraph = createEditorParagraph("￼");
    paragraph.runs[0]!.textBox = {
      width: 200,
      height: 120,
      blocks: [],
      floating: { type: "floating" },
    };

    const lines = measure(paragraph, 600);
    expect(lines[0]!.height).toBeLessThan(120);
  });
});

describe("composeMeasuredParagraphLines polygon wrapping", () => {
  // A centered vertical bar (x in [80,120]) spanning the whole paragraph
  // height, expressed as an absolute-coordinate wrap polygon.
  const centeredBar = (wrap: "tight" | "through"): FloatingExclusionRect => ({
    x: 80,
    y: 0,
    width: 40,
    height: 1000,
    wrap,
    sourceRunId: "img-1",
    polygon: [
      { x: 80, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 1000 },
      { x: 80, y: 1000 },
    ],
  });

  const longText =
    "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu " +
    "nu xi omicron pi rho sigma tau upsilon phi chi psi omega one two three";

  const measureWithExclusion = (exclusion: FloatingExclusionRect) =>
    composeMeasuredParagraphLines({
      paragraph: createEditorParagraph(longText),
      fragments: createFragments(createEditorParagraph(longText)),
      contentWidth: 200,
      exclusions: [exclusion],
    });

  it("keeps tight-wrapped text in a single gap (widest side only)", () => {
    const lines = measureWithExclusion(centeredBar("tight"));
    expect(lines.length).toBeGreaterThan(1);

    // No text starts in the right gap (x >= 120); a single side is used.
    for (const line of lines) {
      expect(line.slots[0]!.left).toBeLessThan(120);
    }
    // No two lines share the same vertical band.
    const tops = lines.map((line) => line.top);
    expect(new Set(tops).size).toBe(tops.length);
  });

  it("flows through-wrapped text into both gaps on the same band", () => {
    const lines = measureWithExclusion(centeredBar("through"));
    expect(lines.length).toBeGreaterThan(1);

    // Some band carries two segment-lines: one in the left gap, one in the
    // right gap, sharing the same `top`.
    const byTop = new Map<number, typeof lines>();
    for (const line of lines) {
      const bucket = byTop.get(line.top) ?? [];
      bucket.push(line);
      byTop.set(line.top, bucket);
    }
    const sharedBand = [...byTop.values()].find((bucket) => bucket.length >= 2);
    expect(sharedBand).toBeDefined();

    const startsInRightGap = lines.some((line) => line.slots[0]!.left >= 120);
    expect(startsInRightGap).toBe(true);

    // Content never overlaps the bar: every slot is outside [80,120].
    for (const line of lines) {
      for (const slot of line.slots) {
        const inBar = slot.left > 80 && slot.left < 120;
        expect(inBar).toBe(false);
      }
    }
  });
});

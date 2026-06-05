import { describe, expect, it } from "vitest";
import { createEditorParagraph } from "../../core/editorState.js";
import {
  projectParagraphLayout,
  resolveClosestOffsetInMeasuredLayout,
} from "../../layoutProjection/index.js";

describe("text measurement alignment geometry", () => {
  it("applies center alignment to line slots", () => {
    const paragraph = createEditorParagraph("centered line");
    paragraph.style = { align: "center" };

    const layout = projectParagraphLayout(paragraph, 0, 1, undefined, 600);
    expect(layout.lines).toHaveLength(1);

    const line = layout.lines[0]!;
    expect(line.slots[0]!.left).toBeGreaterThan(0);
  });

  it("applies right alignment and keeps hit-test geometry in sync", () => {
    const paragraph = createEditorParagraph("right aligned line");
    paragraph.style = { align: "right" };

    const layout = projectParagraphLayout(paragraph, 0, 1, undefined, 600);
    const line = layout.lines[0]!;
    const midSlot = line.slots[Math.floor(line.slots.length / 2)]!;
    const resolvedOffset = resolveClosestOffsetInMeasuredLayout(
      layout,
      midSlot.left + 0.5,
      line.top + line.height * 0.5,
    );

    expect(line.slots[0]!.left).toBeGreaterThan(0);
    expect(Math.abs(resolvedOffset - midSlot.offset)).toBeLessThanOrEqual(1);
  });

  it("preserves offset ordering for selection geometry on aligned text", () => {
    const paragraph = createEditorParagraph("alpha beta gamma delta");
    paragraph.style = { align: "center" };

    const layout = projectParagraphLayout(paragraph, 0, 1, undefined, 600);
    const line = layout.lines[0]!;
    const first = resolveClosestOffsetInMeasuredLayout(
      layout,
      line.slots[1]!.left,
      line.top + line.height * 0.5,
    );
    const second = resolveClosestOffsetInMeasuredLayout(
      layout,
      line.slots[Math.max(2, line.slots.length - 2)]!.left,
      line.top + line.height * 0.5,
    );

    expect(second).toBeGreaterThan(first);
  });
});

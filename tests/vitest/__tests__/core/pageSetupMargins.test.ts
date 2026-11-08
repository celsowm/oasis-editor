import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getMarginPreset,
  getPaperSizePreset,
  MARGIN_PRESETS,
  setSectionMarginsPreset,
} from "@/core/commands/pageSetup.js";
import { getActiveSectionIndex, getParagraphs } from "@/core/model.js";

function buildState(): ReturnType<typeof createEditorStateFromDocument> {
  const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);
  return createEditorStateFromDocument(createEditorDocument([paragraph]));
}

function activeMargins(
  state: ReturnType<typeof createEditorStateFromDocument>,
) {
  const idx = getActiveSectionIndex(state);
  return state.document.sections?.[idx]?.pageSettings?.margins;
}

describe("page-setup margin presets", () => {
  it("exposes the five Word margin presets", () => {
    expect(MARGIN_PRESETS.map((p) => p.id)).toEqual([
      "normal",
      "narrow",
      "moderate",
      "wide",
      "mirrored",
    ]);
  });

  it("looks up a preset by id and rejects unknown ids", () => {
    expect(getMarginPreset("narrow")?.left).toBeCloseTo(1.27, 2);
    expect(getMarginPreset("does-not-exist")).toBeUndefined();
    // Mirror the paper-size preset accessor shape.
    expect(getPaperSizePreset("a4")?.widthPt).toBeCloseTo(595.3, 1);
  });

  it("applies a named preset to the active section margins", () => {
    const state = buildState();
    const wide = getMarginPreset("wide")!;
    const next = setSectionMarginsPreset(state, wide.id);
    expect(next).not.toBe(state);
    const margins = activeMargins(next)!;
    // 5.08 cm ≈ 192 px; 2.54 cm ≈ 96 px at 96 DPI.
    expect(margins.left).toBeCloseTo(192, 0);
    expect(margins.right).toBeCloseTo(192, 0);
    expect(margins.top).toBeCloseTo(96, 0);
    expect(margins.bottom).toBeCloseTo(96, 0);
  });

  it("preserves header/footer/gutter while changing the four sides", () => {
    const base = buildState();
    const idx = getActiveSectionIndex(base);
    const sections = [...base.document.sections!];
    sections[idx] = {
      ...sections[idx],
      pageSettings: {
        ...sections[idx].pageSettings!,
        margins: {
          ...sections[idx].pageSettings!.margins,
          header: 60,
          footer: 70,
          gutter: 15,
        },
      },
    };
    const state = { ...base, document: { ...base.document, sections } };
    const next = setSectionMarginsPreset(state, "normal");
    const margins = activeMargins(next)!;
    expect(margins.header).toBe(60);
    expect(margins.footer).toBe(70);
    expect(margins.gutter).toBe(15);
    // Sides updated to the ABNT normal preset.
    expect(margins.left).toBeCloseTo(3 * 96 / 2.54, 0);
  });

  it("is a no-op for an unknown preset id", () => {
    const state = buildState();
    expect(setSectionMarginsPreset(state, "bogus")).toBe(state);
  });
});

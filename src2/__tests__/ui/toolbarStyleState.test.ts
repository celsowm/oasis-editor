import { describe, expect, it } from "vitest";
import {
  createEditor2ParagraphFromRuns,
  resetEditor2Ids,
} from "../../core/editorState.js";
import type { Editor2Document, Editor2State, Editor2NamedStyle } from "../../core/model.js";
import { getToolbarStyleState } from "../../ui/toolbarStyleState.js";

const GOLDEN_STYLES: Record<string, Editor2NamedStyle> = {
  Normal: {
    id: "Normal",
    name: "Normal",
    type: "paragraph",
    paragraphStyle: {
      lineHeight: 1.6,
      spacingAfter: 10,
    },
    textStyle: {
      fontSize: 20,
      fontFamily: "Calibri",
    },
  },
  Heading1: {
    id: "Heading1",
    name: "Heading 1",
    type: "paragraph",
    basedOn: "Normal",
    paragraphStyle: {
      lineHeight: 1.2,
      spacingBefore: 24,
      spacingAfter: 12,
    },
    textStyle: {
      bold: true,
      fontSize: 28,
    },
  },
};

function makeState(overrides: Partial<Editor2State> & { document: Editor2Document }): Editor2State {
  return {
    selection: {
      anchor: { paragraphId: "p:1", runId: "r:1", offset: 0 },
      focus: { paragraphId: "p:1", runId: "r:1", offset: 0 },
    },
    ...overrides,
  };
}

describe("getToolbarStyleState — golden (current static behavior)", () => {
  it("[GOLDEN] resolves named text style for a run with styleId", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "hello", styles: { styleId: "Heading1" } }]);

    const doc: Editor2Document = {
      id: "doc:golden",
      blocks: [paragraph],
      styles: GOLDEN_STYLES,
    };

    const state = makeState({
      document: doc,
      selection: {
        anchor: { paragraphId: paragraph.id, runId: paragraph.runs[0]!.id, offset: 0 },
        focus: { paragraphId: paragraph.id, runId: paragraph.runs[0]!.id, offset: 0 },
      },
    });

    const toolbarState = getToolbarStyleState(state);

    // Heading1: bold=true, fontSize=28 via textStyle
    expect(toolbarState.bold).toBe(true);
    expect(toolbarState.fontSize).toBe("28");
  });

  it("[GOLDEN] resolves paragraph named styles across selection with mixed styleIds", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "a" }]),
      createEditor2ParagraphFromRuns([{ text: "b" }]),
    ];
    paragraphs[0]!.style = { styleId: "Heading1", spacingBefore: 99 };
    paragraphs[1]!.style = { styleId: "Normal" };

    const doc: Editor2Document = {
      id: "doc:golden",
      blocks: paragraphs,
      styles: GOLDEN_STYLES,
    };

    const state = makeState({
      document: doc,
      selection: {
        anchor: { paragraphId: paragraphs[0]!.id, runId: paragraphs[0]!.runs[0]!.id, offset: 0 },
        focus: { paragraphId: paragraphs[1]!.id, runId: paragraphs[1]!.runs[0]!.id, offset: 0 },
      },
    });

    const toolbarState = getToolbarStyleState(state);

    // spacingBefore: 99 (Heading1 override) != 10 (Normal default) → not uniform → ""
    expect(toolbarState.spacingBefore).toBe("");

    // lineHeight: 1.2 (Heading1) != 1.6 (Normal) → not uniform → ""
    expect(toolbarState.lineHeight).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "../../core/editorState.js";
import { insertTextAtSelection } from "../../core/commands/text.js";
import type { EditorParagraphNode, EditorTextBoxData } from "../../core/model.js";

describe("text box editing preservation", () => {
  it("keeps an anchored text box when typing after sibling normal text", () => {
    const innerParagraph = createEditorParagraphFromRuns([
      { text: "insidebox" },
    ]);

    const textBox: EditorTextBoxData = {
      width: 248,
      height: 147,
      blocks: [innerParagraph],
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: -275590 },
        positionV: { relativeFrom: "paragraph", offset: 87630 },
      },
      shape: {
        preset: "rect",
        fill: "#FFFFFF",
        borderColor: "#000000",
        borderWidthPt: 0.75,
      },
      body: {
        paddingLeft: 10,
        paddingTop: 5,
        paddingRight: 10,
        paddingBottom: 5,
        anchor: "t",
        wrap: "square",
        autoFit: true,
      },
    };

    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        textBox,
      },
      {
        text: "normaltext",
      },
    ]);

    const document = createEditorDocument([paragraph]);

    const state = createEditorStateFromDocument(document, {
      paragraphIndex: 0,
      offset: "\uFFFCnormaltext".length,
    });

    const next = insertTextAtSelection(state, "x");

    const nextParagraph = next.document.sections[0]!
      .blocks[0] as EditorParagraphNode;

    const allText = nextParagraph.runs.map((run) => run.text).join("");
    expect(allText).toBe("\uFFFCnormaltextx");

    const textBoxRuns = nextParagraph.runs.filter((run) => run.textBox);
    expect(textBoxRuns).toHaveLength(1);
    expect(textBoxRuns[0]!.text).toBe("\uFFFC");

    const inner = textBoxRuns[0]!.textBox!.blocks[0] as EditorParagraphNode;
    expect(inner.runs.map((run) => run.text).join("")).toBe("insidebox");
  });
});

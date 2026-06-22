import { getRunImage, getRunTextBox, getRunField, getRunFieldChar, getRunFieldInstruction, getRunFootnoteReference, getRunEndnoteReference, getRunSym } from "@/core/model.js";
import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getSelectedImageCaption,
  setSelectedImageCaption,
} from "@/core/commands/image.js";
import {
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";

const image: EditorImageRunData = {
  src: "data:image/png;base64,AAAA",
  width: 120,
  height: 80,
};

function selectImage(state: EditorState, paragraph: EditorParagraphNode) {
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
}

function stateWithSelectedImage() {
  const paragraph = createEditorParagraphFromRuns([{ text: "\uFFFC", image }]);
  return selectImage(
    createEditorStateFromDocument(createEditorDocument([paragraph])),
    paragraph,
  );
}

function textOf(paragraph: EditorParagraphNode) {
  return paragraph.runs.map((run) => run.text).join("");
}

describe("image captions", () => {
  it("inserts a visible Caption paragraph with a Word SEQ field", () => {
    const next = setSelectedImageCaption(
      stateWithSelectedImage(),
      "Vista geral",
      "Figura",
    );

    const paragraphs = getParagraphs(next);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1]!.style?.styleId).toBe("Caption");
    expect(textOf(paragraphs[1]!)).toBe("Figura 1: Vista geral");
    expect(
      paragraphs[1]!.runs.map((run) => getRunFieldChar(run)?.kind).filter(Boolean),
    ).toEqual(["begin", "separate", "end"]);
    expect(
      paragraphs[1]!.runs.some((run) =>
        getRunFieldInstruction(run)?.includes("SEQ Figure \\* ARABIC"),
      ),
    ).toBe(true);
  });

  it("updates an adjacent generated caption instead of duplicating it", () => {
    const inserted = setSelectedImageCaption(
      stateWithSelectedImage(),
      "Primeira legenda",
      "Figura",
    );
    const imageParagraph = getParagraphs(inserted)[0]!;
    const selectedAgain = selectImage(inserted, imageParagraph);
    const updated = setSelectedImageCaption(
      selectedAgain,
      "Legenda revisada",
      "Figura",
    );

    const paragraphs = getParagraphs(updated);
    expect(paragraphs).toHaveLength(2);
    expect(textOf(paragraphs[1]!)).toBe("Figura 1: Legenda revisada");
    expect(getSelectedImageCaption(selectImage(updated, paragraphs[0]!))).toBe(
      "Legenda revisada",
    );
  });

  it("renumbers multiple image captions in document order", () => {
    const firstImage = createEditorParagraphFromRuns([
      { text: "\uFFFC", image },
    ]);
    const secondImage = createEditorParagraphFromRuns([
      { text: "\uFFFC", image },
    ]);
    const state = createEditorStateFromDocument(
      createEditorDocument([firstImage, secondImage]),
    );

    const withFirst = setSelectedImageCaption(
      selectImage(state, firstImage),
      "Primeira",
      "Figura",
    );
    const secondImageAfterInsert = getParagraphs(withFirst)[2]!;
    const withSecond = setSelectedImageCaption(
      selectImage(withFirst, secondImageAfterInsert),
      "Segunda",
      "Figura",
    );

    const captions = getParagraphs(withSecond).filter(
      (paragraph) => paragraph.style?.styleId === "Caption",
    );
    expect(captions.map(textOf)).toEqual([
      "Figura 1: Primeira",
      "Figura 2: Segunda",
    ]);
  });

  it("updates an imported-style Caption paragraph next to the selected image", () => {
    const imageParagraph = createEditorParagraphFromRuns([
      { text: "\uFFFC", image },
    ]);
    const caption = createEditorParagraph("Figure 7: Old caption");
    caption.style = { styleId: "Caption" };
    caption.runs = [
      { id: "r1", text: "Figure ", kind: "text" as const },
      { id: "r2", text: "", kind: "fieldChar", fieldChar: { kind: "begin" } },
      {
        id: "r3",
        text: "",
        kind: "fieldInstruction",
        fieldInstruction: " SEQ Figure \\* ARABIC ",
      },
      {
        id: "r4",
        text: "",
        kind: "fieldChar",
        fieldChar: { kind: "separate" },
      },
      { id: "r5", text: "7", kind: "text" as const },
      { id: "r6", text: "", kind: "fieldChar", fieldChar: { kind: "end" } },
      { id: "r7", text: ": Old caption", kind: "text" as const },
    ];
    const state = selectImage(
      createEditorStateFromDocument(
        createEditorDocument([imageParagraph, caption]),
      ),
      imageParagraph,
    );

    const next = setSelectedImageCaption(state, "Nova legenda", "Figura");

    expect(getParagraphs(next)).toHaveLength(2);
    expect(textOf(getParagraphs(next)[1]!)).toBe("Figura 1: Nova legenda");
  });
});

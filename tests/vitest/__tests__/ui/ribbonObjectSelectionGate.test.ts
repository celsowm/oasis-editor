import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorState,
} from "@/core/model.js";
import { buildEssentialsGate } from "@/ui/app/essentials/gate.js";
import type { CreateEditorEssentialsPluginOptions } from "@/ui/app/essentials/types.js";
import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";

const image: EditorImageRunData = { src: "asset:1", width: 48, height: 48 };

function stateWithSelection(
  runs: Parameters<typeof createEditorParagraphFromRuns>[0],
  start: number,
  end: number,
): EditorState {
  const paragraph = createEditorParagraphFromRuns(runs);
  const base = createEditorStateFromDocument(createEditorDocument([paragraph]));
  return {
    ...base,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, start),
      focus: paragraphOffsetToPosition(paragraph, end),
    },
  };
}

/** Selection covering exactly the object-replacement character. */
const imageState = (): EditorState =>
  stateWithSelection([{ text: "￼", image }, { text: "after" }], 0, 1);

const textState = (): EditorState =>
  stateWithSelection([{ text: "before" }, { text: "after" }], 0, 3);

const textBoxState = (): EditorState =>
  stateWithSelection(
    [
      {
        text: "￼",
        textBox: { width: 120, height: 60, blocks: [] },
      },
      { text: "after" },
    ],
    0,
    1,
  );

function gateFor(state: () => EditorState) {
  return buildEssentialsGate({
    state,
    isReadOnly: () => false,
  } as unknown as CreateEditorEssentialsPluginOptions);
}

const CHARACTER_COMMANDS: OasisBuiltinCommand[] = [
  "bold",
  "italic",
  "underline",
  "strike",
  "allCaps",
  "superscript",
  "setFontFamily",
  "setFontSize",
  "increaseFontSize",
  "setColor",
  "setHighlight",
  "setTextShading",
  "setCharacterStyleId",
  "applyUnderlineStyle",
  "changeTextCase",
  "clearFormatting",
  "setKerning",
];

describe("inline image selection command gate", () => {
  it("disables character formatting while an image is selected", () => {
    const gate = gateFor(imageState);
    for (const command of CHARACTER_COMMANDS) {
      expect(gate.isCommandEnabled(command), command).toBe(false);
    }
  });

  it("disables character formatting for a selected text box", () => {
    const gate = gateFor(textBoxState);
    expect(gate.isCommandEnabled("bold")).toBe(false);
    expect(gate.isCommandEnabled("setFontFamily")).toBe(false);
    expect(gate.isCommandEnabled("alignCenter")).toBe(true);
  });

  it("keeps paragraph-scoped and object commands available", () => {
    const gate = gateFor(imageState);
    for (const command of [
      "alignLeft",
      "alignCenter",
      "bulletList",
      "setStyleId",
      "setLineHeight",
      "imageWidthCm",
      "imageCrop",
      "editImageAlt",
      "copy",
      "undo",
    ] as OasisBuiltinCommand[]) {
      expect(gate.isCommandEnabled(command), command).toBe(true);
    }
  });

  it("re-enables character formatting for text selections", () => {
    const gate = gateFor(textState);
    for (const command of CHARACTER_COMMANDS) {
      expect(gate.isCommandEnabled(command), command).toBe(true);
    }
  });

  it("follows the live selection between object and text", () => {
    let state = imageState();
    const gate = buildEssentialsGate({
      state: () => state,
      isReadOnly: () => false,
    } as unknown as CreateEditorEssentialsPluginOptions);
    expect(gate.isCommandEnabled("bold")).toBe(false);
    state = textState();
    expect(gate.isCommandEnabled("bold")).toBe(true);
  });

  it("still denies formatting in read-only mode", () => {
    const gate = buildEssentialsGate({
      state: textState,
      isReadOnly: () => true,
    } as unknown as CreateEditorEssentialsPluginOptions);
    expect(gate.isCommandEnabled("bold")).toBe(false);
  });

  it("tolerates options without a state accessor", () => {
    const gate = buildEssentialsGate({
      isReadOnly: () => false,
    } as unknown as CreateEditorEssentialsPluginOptions);
    expect(gate.isCommandEnabled("bold")).toBe(true);
  });
});

describe("read-only command gate", () => {
  const readOnlyGate = () =>
    buildEssentialsGate({
      isReadOnly: () => true,
    } as unknown as CreateEditorEssentialsPluginOptions);

  it("keeps view, copy and context commands usable while gating mutations", () => {
    const gate = readOnlyGate();
    for (const name of [
      "copy",
      "find",
      "exportPdf",
      "toggleShowParagraphMarks",
      // Context detectors drive contextual tabs without mutating anything.
      "imageContext",
      "tableContext",
      // Gridlines are a view option; documentStyles is a no-op data carrier.
      "toggleTableGridlines",
      "documentStyles",
    ] as OasisBuiltinCommand[])
      expect(gate.isCommandEnabled(name), name).toBe(true);
    for (const name of [
      "bold",
      "moveParagraphsUp",
      "moveParagraphsDown",
      "tableToggleHeaderRow",
      "setTableStyle",
      "tableAutoFit",
      "tableDistributeColumns",
      "toggleTableDrawBorders",
      "imageCrop",
      "imageWidthCm",
    ] as OasisBuiltinCommand[])
      expect(gate.isCommandEnabled(name), name).toBe(false);
  });
});

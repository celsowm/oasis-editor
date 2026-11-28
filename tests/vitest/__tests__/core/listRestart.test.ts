import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type { EditorParagraphNode } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import {
  continueListAtSelection,
  restartListAtSelection,
} from "@/core/commands/list.js";
import { getListRestartInfo } from "@/core/document/listRestart.js";
import { buildListLabels } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

function listed(text: string, instanceId = "shared"): EditorParagraphNode {
  const paragraph = createEditorParagraph(text);
  paragraph.list = { kind: "ordered", level: 0, instanceId };
  return paragraph;
}

function selectParagraph(state: ReturnType<typeof createEditorStateFromDocument>, index: number) {
  const paragraph = getParagraphs(state)[index]!;
  const length = paragraph.runs.map(run => run.text).join("").length;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, length),
    },
  };
}

describe("list restart commands", () => {
  it("restarts the selected item and continues the next one", () => {
    const paragraphs = [listed("one"), listed("two"), listed("three")];
    const state = selectParagraph(
      createEditorStateFromDocument(createEditorDocument(paragraphs)),
      1,
    );
    expect(getListRestartInfo(state)).toMatchObject({
      canRestart: true,
      canContinue: false,
    });

    const restarted = restartListAtSelection(state, 7);
    expect(getListRestartInfo(restarted)).toMatchObject({
      canRestart: true,
      canContinue: true,
      currentStartAt: 7,
    });
    const labels = buildListLabels(restarted.document, "en-US");
    expect(labels.get(paragraphs[0]!.id)).toBe("1.");
    expect(labels.get(paragraphs[1]!.id)).toBe("7.");
    expect(labels.get(paragraphs[2]!.id)).toBe("8.");

    const continued = continueListAtSelection(restarted);
    expect(getListRestartInfo(continued).canContinue).toBe(false);
    expect(buildListLabels(continued.document, "en-US").get(paragraphs[1]!.id)).toBe("2.");
  });

  it("creates a separate w:num for a mid-list restart and round-trips it", async () => {
    const paragraphs = [listed("one"), listed("two"), listed("three")];
    const state = selectParagraph(
      createEditorStateFromDocument(createEditorDocument(paragraphs)),
      1,
    );
    const restarted = restartListAtSelection(state, 5);
    const zip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(restarted.document),
    );
    const numbering = (await zip.file("word/numbering.xml")?.async("string")) ?? "";
    const numIds = [...numbering.matchAll(/<w:num w:numId="(\d+)"/g)].map(match => match[1]);
    expect(new Set(numIds).size).toBe(2);
    expect(numbering).toMatch(/<w:start w:val="5"\/>/);

    const reopened = await importDocxToEditorDocument(
      await exportEditorDocumentToDocx(restarted.document),
    );
    const reopenedParagraphs = getParagraphs(
      createEditorStateFromDocument(reopened),
    );
    expect(reopenedParagraphs[1]!.list?.startAt).toBe(5);
    expect(buildListLabels(reopened, "en-US").get(reopenedParagraphs[2]!.id)).toBe("6.");
  });
});

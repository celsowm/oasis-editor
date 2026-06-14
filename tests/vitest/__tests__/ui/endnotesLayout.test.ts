import { describe, it, expect, beforeEach } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  resetEditorIds,
} from "../../../../src/core/editorState.js";
import { renumberEndnotes } from "../../../../src/core/endnotes.js";
import { projectDocumentLayout } from "../../../../src/layoutProjection/index.js";
import type {
  EditorDocument,
  EditorParagraphNode,
  EditorTextRun,
} from "../../../../src/core/model.js";

beforeEach(() => {
  resetEditorIds();
});

function refRun(endnoteId: string): EditorTextRun {
  return {
    id: `run:${endnoteId}`,
    text: "?",
    styles: { superscript: true },
    endnoteReference: { endnoteId },
  };
}

function buildDoc(): EditorDocument {
  const paragraph: EditorParagraphNode = {
    id: "paragraph:body",
    type: "paragraph",
    runs: [{ id: "run:lead", text: "body" }, refRun("endnote:a")],
  };
  const doc = createEditorDocument([paragraph]);
  doc.endnotes = {
    items: {
      "endnote:a": {
        id: "endnote:a",
        blocks: [createEditorParagraph("The end note text.")],
      },
    },
  };
  return renumberEndnotes(doc);
}

function collectSourceBlockIds(
  layout: ReturnType<typeof projectDocumentLayout>,
): string[] {
  const ids: string[] = [];
  for (const page of layout.pages) {
    for (const block of page.blocks) {
      ids.push(block.sourceBlock.id);
    }
  }
  return ids;
}

describe("projectDocumentLayout endnotes", () => {
  it("appends referenced endnote bodies to the document flow", () => {
    const layout = projectDocumentLayout(buildDoc());
    const ids = collectSourceBlockIds(layout);
    expect(ids.some((id) => id.startsWith("endnote-flow:"))).toBe(true);
  });

  it("does not inject anything when there are no referenced endnotes", () => {
    const doc = createEditorDocument([createEditorParagraph("plain")]);
    doc.endnotes = {
      items: {
        "endnote:orphan": {
          id: "endnote:orphan",
          blocks: [createEditorParagraph("orphan")],
        },
      },
    };
    const layout = projectDocumentLayout(doc);
    const ids = collectSourceBlockIds(layout);
    expect(ids.some((id) => id.startsWith("endnote-flow:"))).toBe(false);
  });
});

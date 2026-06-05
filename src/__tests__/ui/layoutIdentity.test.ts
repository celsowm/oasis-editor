import { describe, expect, it, beforeEach } from "vitest";
import {
  createEditorDocument,
  createEditorFootnote,
  createEditorParagraph,
  createEditorRun,
  createFootnoteReferenceRun,
  resetEditorIds,
} from "../../core/editorState.js";
import { projectDocumentLayout } from "../../layoutProjection/index.js";
import { createLayoutIdentityStabilizer } from "../../ui/layoutIdentity.js";

beforeEach(() => {
  resetEditorIds();
});

describe("layout identity stabilization", () => {
  it("does not reuse a page when only footnote text changes", () => {
    const body = createEditorParagraph("");
    const footnoteParagraph = createEditorParagraph("old note");
    const footnote = createEditorFootnote([footnoteParagraph]);
    body.runs = [
      createEditorRun("body"),
      createFootnoteReferenceRun(footnote.id, "1"),
    ];
    const document = createEditorDocument([body]);
    document.footnotes = { items: { [footnote.id]: footnote } };
    const stabilize = createLayoutIdentityStabilizer();

    const firstLayout = stabilize(
      projectDocumentLayout(document, undefined, undefined, undefined, {
        layoutMode: "wordParity",
      }),
    );
    const firstPage = firstLayout.pages[0]!;

    const updatedFootnoteParagraph = {
      ...footnoteParagraph,
      runs: [{ ...footnoteParagraph.runs[0]!, text: "updated note" }],
    };
    const updatedDocument = {
      ...document,
      footnotes: {
        items: {
          [footnote.id]: {
            ...footnote,
            blocks: [updatedFootnoteParagraph],
          },
        },
      },
    };

    const secondLayout = stabilize(
      projectDocumentLayout(updatedDocument, undefined, undefined, undefined, {
        layoutMode: "wordParity",
      }),
    );
    const secondPage = secondLayout.pages[0]!;

    expect(secondPage).not.toBe(firstPage);
    expect(secondPage.footnoteBlocks?.[0]).not.toBe(
      firstPage.footnoteBlocks?.[0],
    );
  });
});

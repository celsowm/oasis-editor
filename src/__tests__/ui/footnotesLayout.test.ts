import { describe, expect, it, beforeEach } from "vitest";
import {
  createEditorDocument,
  createEditorFootnote,
  createEditorParagraph,
  createEditorRun,
  createFootnoteReferenceRun,
  resetEditorIds,
} from "../../core/editorState.js";
import { getPageBodyBottom } from "../../core/model.js";
import { projectDocumentLayout } from "../../ui/layoutProjection.js";

beforeEach(() => {
  resetEditorIds();
});

function buildDocumentWithFootnotes(count = 1) {
  const paragraph = createEditorParagraph("");
  const footnotes = Array.from({ length: count }, (_, index) =>
    createEditorFootnote([createEditorParagraph(`note ${index + 1}`)]),
  );
  paragraph.runs = [
    createEditorRun("body"),
    ...footnotes.flatMap((footnote, index) => [
      createFootnoteReferenceRun(footnote.id, String(index + 1)),
      createEditorRun(` text${index + 1}`),
    ]),
  ];
  const document = createEditorDocument([paragraph]);
  document.footnotes = {
    items: Object.fromEntries(footnotes.map((footnote) => [footnote.id, footnote])),
  };
  return { document, paragraph, footnotes };
}

describe("projectDocumentLayout footnotes", () => {
  it("reserves page body height and projects footnote blocks for a referenced note", () => {
    const { document, footnotes } = buildDocumentWithFootnotes(1);

    const layout = projectDocumentLayout(document, undefined, undefined, undefined, {
      layoutMode: "wordParity",
    });
    const page = layout.pages[0]!;

    expect(page.footnoteReferenceIds).toEqual([footnotes[0]!.id]);
    expect(page.footnoteBlocks?.length).toBeGreaterThan(0);
    expect(page.footnoteTop).toBeGreaterThan(page.bodyBottom!);
    expect(page.bodyBottom).toBeLessThan(getPageBodyBottom(page.pageSettings));
  });

  it("keeps footnotes on the page that contains their inline reference", () => {
    const { document, footnotes } = buildDocumentWithFootnotes(1);
    const secondPage = createEditorParagraph("second page");
    secondPage.style = { pageBreakBefore: true };
    document.sections![0]!.blocks.push(secondPage);

    const layout = projectDocumentLayout(document, undefined, undefined, undefined, {
      layoutMode: "wordParity",
    });

    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    expect(layout.pages[0]!.footnoteReferenceIds).toEqual([footnotes[0]!.id]);
    expect(layout.pages[1]!.footnoteReferenceIds).toBeUndefined();
  });

  it("orders multiple footnotes by their reference order on the page", () => {
    const { document, footnotes } = buildDocumentWithFootnotes(2);

    const layout = projectDocumentLayout(document, undefined, undefined, undefined, {
      layoutMode: "wordParity",
    });

    expect(layout.pages[0]!.footnoteReferenceIds).toEqual([
      footnotes[0]!.id,
      footnotes[1]!.id,
    ]);
  });

  it("does not create a footnote area when no reference exists", () => {
    const paragraph = createEditorParagraph("plain");
    const document = createEditorDocument([paragraph]);
    document.footnotes = {
      items: {
        "footnote:orphan": createEditorFootnote([createEditorParagraph("orphan")]),
      },
    };

    const layout = projectDocumentLayout(document, undefined, undefined, undefined, {
      layoutMode: "wordParity",
    });

    expect(layout.pages[0]!.footnoteBlocks).toBeUndefined();
    expect(layout.pages[0]!.footnoteReferenceIds).toBeUndefined();
  });
});

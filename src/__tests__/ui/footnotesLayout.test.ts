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
import { projectDocumentLayout } from "../../layoutProjection/index.js";

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
    items: Object.fromEntries(
      footnotes.map((footnote) => [footnote.id, footnote]),
    ),
  };
  return { document, paragraph, footnotes };
}

describe("projectDocumentLayout footnotes", () => {
  it("reserves page body height and projects footnote blocks for a referenced note", () => {
    const { document, footnotes } = buildDocumentWithFootnotes(1);

    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
      {},
    );
    const page = layout.pages[0]!;

    expect(page.footnoteReferenceIds).toEqual([footnotes[0]!.id]);
    expect(page.footnoteBlocks?.length).toBeGreaterThan(0);
    expect(page.footnoteTop).toBeGreaterThan(page.bodyBottom!);
    expect(page.footnoteSeparatorTop).toBeGreaterThanOrEqual(page.bodyBottom!);
    expect(page.bodyBottom).toBeLessThan(getPageBodyBottom(page.pageSettings));
  });

  it("places footnotes above footer content when a footer is present", () => {
    const { document } = buildDocumentWithFootnotes(1);
    const footer = createEditorParagraph("footer text");
    footer.style = { styleId: "footer" };
    const section = document.sections?.[0];
    if (!section) {
      throw new Error("document missing default section");
    }
    document.sections = [
      {
        ...section,
        footer: [footer],
      },
    ];

    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
      {},
    );
    const page = layout.pages[0]!;

    expect(page.footerTop).toBeDefined();
    expect(page.footnoteTop).toBeDefined();
    expect(page.footnoteTop!).toBeGreaterThan(page.bodyBottom!);
    expect(page.footnoteSeparatorTop!).toBeGreaterThanOrEqual(page.bodyBottom!);
    expect(page.footnoteTop!).toBeLessThan(page.footerTop!);
  });

  it("does not subtract footnote reservation twice from the footer page body", () => {
    const { document, footnotes } = buildDocumentWithFootnotes(1);
    const footer = createEditorParagraph("footer text");
    footer.style = { styleId: "footer" };
    const section = document.sections?.[0];
    if (!section) {
      throw new Error("document missing default section");
    }
    document.sections = [
      {
        ...section,
        footer: [footer],
      },
    ];

    const documentWithoutReference = createEditorDocument([
      createEditorParagraph("body text without footnote reference"),
    ]);
    documentWithoutReference.sections = [
      {
        ...documentWithoutReference.sections![0]!,
        footer: [footer],
      },
    ];

    const basePage = projectDocumentLayout(
      documentWithoutReference,
      undefined,
      undefined,
      undefined,
    ).pages[0]!;
    const page = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
      {},
    ).pages[0]!;

    const reservedHeight = Math.max(
      0,
      (basePage.bodyBottom ?? getPageBodyBottom(basePage.pageSettings)) -
        page.bodyBottom!,
    );

    expect(page.footnoteReferenceIds).toEqual([footnotes[0]!.id]);
    expect(page.footerTop).toBe(basePage.footerTop);
    expect(reservedHeight).toBeGreaterThan(0);
    expect(page.footnoteSeparatorTop).toBe(page.bodyBottom);
    expect(page.footnoteTop).toBe(page.bodyBottom! + 10);
    expect(page.footnoteTop!).toBeLessThan(basePage.bodyBottom!);
    expect(page.footnoteTop!).toBeLessThan(page.footerTop!);
  });

  it("keeps footnotes on the page that contains their inline reference", () => {
    const { document, footnotes } = buildDocumentWithFootnotes(1);
    const secondPage = createEditorParagraph("second page");
    secondPage.style = { pageBreakBefore: true };
    document.sections![0]!.blocks.push(secondPage);

    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
      {},
    );

    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    expect(layout.pages[0]!.footnoteReferenceIds).toEqual([footnotes[0]!.id]);
    expect(layout.pages[1]!.footnoteReferenceIds).toBeUndefined();
  });

  it("orders multiple footnotes by their reference order on the page", () => {
    const { document, footnotes } = buildDocumentWithFootnotes(2);

    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
      {},
    );

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
        "footnote:orphan": createEditorFootnote([
          createEditorParagraph("orphan"),
        ]),
      },
    };

    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
      {},
    );

    expect(layout.pages[0]!.footnoteBlocks).toBeUndefined();
    expect(layout.pages[0]!.footnoteReferenceIds).toBeUndefined();
  });
});

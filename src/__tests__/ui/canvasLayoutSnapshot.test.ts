import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "../../core/editorState.js";
import { projectDocumentLayout } from "../../ui/layoutProjection.js";
import { buildCanvasLayoutSnapshot } from "../../ui/canvas/CanvasLayoutSnapshot.js";

function createRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function createSurfaceWithSinglePage(pageIndex = 0): { surface: HTMLDivElement; page: HTMLDivElement } {
  const surface = document.createElement("div");
  const page = document.createElement("div");
  page.dataset.renderer = "canvas";
  page.dataset.pageIndex = String(pageIndex);
  surface.appendChild(page);
  return { surface, page };
}

describe("buildCanvasLayoutSnapshot", () => {
  it("offsets first-page paragraph line geometry by spacingBefore for hit testing", () => {
    const heading = createEditorParagraph("Capítulo 1");
    heading.style = { spacingBefore: 32, spacingAfter: 0 };
    const document = createEditorDocument([heading]);
    const state = createEditorStateFromDocument(document);
    const projected = projectDocumentLayout(document, undefined, undefined, undefined, {
      layoutMode: "wordParity",
    });
    const projectedPage = projected.pages[0];
    if (!projectedPage) {
      throw new Error("missing projected page");
    }

    const { surface, page } = createSurfaceWithSinglePage(projectedPage.index);
    surface.getBoundingClientRect = () => createRect(0, 0, 940, 1200);
    page.getBoundingClientRect = () => createRect(100, 200, 816, 1056);

    const snapshot = buildCanvasLayoutSnapshot({
      surface,
      state,
      layoutMode: "wordParity",
    });
    const headingParagraph = snapshot!.paragraphs.find(
      (paragraph) => paragraph.zone === "main" && paragraph.paragraphId === heading.id,
    );
    const expectedParagraphTop = 200 + (projectedPage.bodyTop ?? 0);

    expect(headingParagraph).toBeDefined();
    expect(headingParagraph!.top).toBe(expectedParagraphTop);
    expect(headingParagraph!.lines[0]?.top).toBe(expectedParagraphTop + 32);
    expect(headingParagraph!.lines[0]?.slots[0]?.top).toBe(expectedParagraphTop + 32);
  });

  it("uses projected headerTop/footerTop offsets for header/footer paragraph geometry", () => {
    const header = createEditorParagraph("header text");
    header.style = { styleId: "header" };
    const body = createEditorParagraph("body text");
    const footer = createEditorParagraph("footer text");
    footer.style = { styleId: "footer" };

    const document = createEditorDocument([body]);
    const firstSection = document.sections?.[0];
    if (!firstSection) {
      throw new Error("document missing default section");
    }
    document.sections = [
      {
        ...firstSection,
        blocks: [body],
        header: [header],
        footer: [footer],
      },
    ];

    const state = createEditorStateFromDocument(document);
    const projected = projectDocumentLayout(document, undefined, undefined, undefined, {
      layoutMode: "wordParity",
    });
    const projectedPage = projected.pages[0];
    if (!projectedPage) {
      throw new Error("missing projected page");
    }

    const { surface, page } = createSurfaceWithSinglePage(projectedPage.index);
    surface.getBoundingClientRect = () => createRect(20, 30, 940, 1200);
    page.getBoundingClientRect = () => createRect(100, 200, 816, 1056);

    const snapshot = buildCanvasLayoutSnapshot({
      surface,
      state,
      layoutMode: "wordParity",
    });
    expect(snapshot).not.toBeNull();
    const headerParagraph = snapshot!.paragraphs.find(
      (paragraph) => paragraph.zone === "header" && paragraph.paragraphId === header.id,
    );
    const footerParagraph = snapshot!.paragraphs.find(
      (paragraph) => paragraph.zone === "footer" && paragraph.paragraphId === footer.id,
    );
    expect(headerParagraph).toBeDefined();
    expect(footerParagraph).toBeDefined();

    const expectedHeaderTop = 200 + (projectedPage.headerTop ?? 0);
    const expectedFooterTop = 200 + (projectedPage.footerTop ?? projectedPage.bodyBottom ?? 0);
    expect(headerParagraph!.top).toBe(expectedHeaderTop);
    expect(footerParagraph!.top).toBe(expectedFooterTop);

    expect(headerParagraph!.lines[0]?.top).toBe(expectedHeaderTop);
    expect(headerParagraph!.lines[0]?.slots[0]?.top).toBe(expectedHeaderTop);
    expect(footerParagraph!.lines[0]?.top).toBe(expectedFooterTop);
    expect(footerParagraph!.lines[0]?.slots[0]?.top).toBe(expectedFooterTop);
  });
});

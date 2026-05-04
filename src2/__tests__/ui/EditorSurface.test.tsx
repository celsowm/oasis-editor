import { describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { EditorSurface } from "../../ui/components/EditorSurface.js";
import {
  createEditor2Document,
  createEditor2ParagraphFromRuns,
  createEditor2Table,
  createEditor2TableCell,
  createEditor2TableRow,
} from "../../core/editorState.js";
import type { Editor2State } from "../../core/model.js";

describe("EditorSurface", () => {
  it("renders separate DOM runs for a multi-run paragraph", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const runNodes = container.querySelectorAll('[data-testid="editor-2-run"]');
    const charNodes = container.querySelectorAll('[data-testid="editor-2-char"]');

    expect(runNodes.length).toBe(2);
    expect(runNodes[0]?.getAttribute("data-run-id")).toBe(paragraph.runs[0]?.id);
    expect(runNodes[1]?.getAttribute("data-run-id")).toBe(paragraph.runs[1]?.id);
    expect(charNodes[0]?.getAttribute("data-char-index")).toBe("0");
    expect(charNodes[1]?.getAttribute("data-char-index")).toBe("1");
    expect(charNodes[2]?.getAttribute("data-char-index")).toBe("2");
    expect(charNodes[3]?.getAttribute("data-char-index")).toBe("3");

    dispose();
  });

  it("applies inline run styles from the semantic AST", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([
      {
        text: "ab",
        styles: {
          bold: true,
          italic: true,
          underline: true,
          strike: true,
          color: "#112233",
          highlight: "#ffee00",
          fontFamily: "Georgia",
          fontSize: 18,
        },
      },
    ]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const runNode = container.querySelector('[data-testid="editor-2-run"]') as HTMLSpanElement;

    expect(runNode.style.fontWeight).toBe("700");
    expect(runNode.style.fontStyle).toBe("italic");
    expect(runNode.style.textDecoration).toContain("underline");
    expect(runNode.style.textDecoration).toContain("line-through");
    expect(runNode.style.color).toBe("rgb(17, 34, 51)");
    expect(runNode.style.backgroundColor).toBe("rgb(255, 238, 0)");
    expect(runNode.style.fontFamily).toContain("Georgia");
    expect(runNode.style.fontSize).toBe("18px");

    dispose();
  });

  it("renders inline image runs as img elements with preserved dimensions", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "A" },
      {
        text: "\uFFFC",
        image: {
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          width: 48,
          height: 24,
          alt: "Decorative chart",
        },
      },
      { text: "B" },
    ]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const image = container.querySelector(".oasis-editor-2-image") as HTMLImageElement;
    const chars = container.querySelectorAll('[data-testid="editor-2-char"]');

    expect(image).not.toBeNull();
    expect(image.getAttribute("src")).toContain("data:image/png;base64,");
    expect(image.getAttribute("width")).toBe("48");
    expect(image.getAttribute("height")).toBe("24");
    expect(image.getAttribute("alt")).toBe("Decorative chart");
    expect(chars.length).toBe(3);

    dispose();
  });

  it("renders the same paragraph across multiple paginated blocks", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([{ text: "x".repeat(1800) }]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          measuredBlockHeights={() => ({})}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const pages = container.querySelectorAll('[data-testid="editor-2-page"]');
    const blocks = Array.from(container.querySelectorAll('[data-testid="editor-2-block"]'))
      .filter((node) => node.getAttribute("data-paragraph-id") === paragraph.id);

    expect(pages.length).toBeGreaterThan(1);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0]?.getAttribute("data-start-offset")).toBe("0");
    expect(Number(blocks[blocks.length - 1]?.getAttribute("data-end-offset"))).toBe(
      paragraph.runs[0]!.text.length,
    );

    dispose();
  });

  it("marks an inline image as selected when its object slot is selected", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "A" },
      {
        text: "\uFFFC",
        image: {
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          width: 48,
          height: 24,
        },
      },
      { text: "B" },
    ]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[1]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[1]!.id,
          offset: 1,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const image = container.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
    expect(image.classList.contains("oasis-editor-2-image-selected")).toBe(true);

    dispose();
  });

  it("applies paragraph layout styles from the semantic AST", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([{ text: "ab" }]);
    paragraph.style = {
      align: "center",
      lineHeight: 1.8,
      spacingBefore: 12,
      spacingAfter: 8,
      indentLeft: 16,
      indentRight: 10,
      indentFirstLine: 24,
    };
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const blockNode = container.querySelector('[data-testid="editor-2-block"]') as HTMLParagraphElement;

    expect(blockNode.style.textAlign).toBe("center");
    expect(blockNode.style.lineHeight).toBe("1.8");
    expect(blockNode.style.paddingTop).toBe("12px");
    expect(blockNode.style.paddingBottom).toBe("8px");
    expect(blockNode.style.paddingLeft).toBe("16px");
    expect(blockNode.style.paddingRight).toBe("10px");
    expect(blockNode.style.textIndent).toBe("24px");

    dispose();
  });

  it("renders paginated page containers for the projected document layout", () => {
    const container = document.createElement("div");
    const paragraphs = Array.from({ length: 3 }, (_, index) =>
      createEditor2ParagraphFromRuns([{ text: `${index}`.repeat(520) }]),
    );
    const state: Editor2State = {
      document: createEditor2Document(paragraphs),
      selection: {
        anchor: {
          paragraphId: paragraphs[0]!.id,
          runId: paragraphs[0]!.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraphs[0]!.id,
          runId: paragraphs[0]!.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    expect(container.querySelectorAll('[data-testid="editor-2-page"]').length).toBeGreaterThan(1);

    dispose();
  });

  it("renders semantic tables as a real grid with paragraph content in cells", () => {
    const container = document.createElement("div");
    const intro = createEditor2ParagraphFromRuns([{ text: "Intro" }]);
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "A1" }])]),
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "B1", styles: { bold: true } }])]),
      ]),
    ]);
    const state: Editor2State = {
      document: createEditor2Document([intro, table]),
      selection: {
        anchor: {
          paragraphId: intro.id,
          runId: intro.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: intro.id,
          runId: intro.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    expect(container.querySelector('[data-testid="editor-2-table"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="editor-2-table-row"]').length).toBe(1);
    expect(container.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(2);
    expect(container.textContent).toContain("A1");
    expect(container.textContent).toContain("B1");

    dispose();
  });

  it("renders paginated table segments with repeated header rows on continued pages", () => {
    const container = document.createElement("div");
    const table = createEditor2Table([
      createEditor2TableRow(
        [createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Header".repeat(18) }])])],
        { isHeader: true },
      ),
      ...Array.from({ length: 20 }, (_, index) =>
        createEditor2TableRow([
          createEditor2TableCell([
            createEditor2ParagraphFromRuns([{ text: `Body${index}`.repeat(28) }]),
          ]),
        ]),
      ),
    ]);
    const state: Editor2State = {
      document: createEditor2Document([table]),
      selection: {
        anchor: {
          paragraphId: table.rows[0]!.cells[0]!.blocks[0]!.id,
          runId: table.rows[0]!.cells[0]!.blocks[0]!.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: table.rows[0]!.cells[0]!.blocks[0]!.id,
          runId: table.rows[0]!.cells[0]!.blocks[0]!.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const pages = container.querySelectorAll('[data-testid="editor-2-page"]');
    const tables = container.querySelectorAll('[data-testid="editor-2-table"]');
    const repeatedRows = container.querySelectorAll('[data-repeated-header="true"]');

    expect(pages.length).toBeGreaterThan(1);
    expect(tables.length).toBeGreaterThan(1);
    expect(repeatedRows.length).toBeGreaterThan(0);
    expect(repeatedRows[0]?.textContent).toContain("Header");
    expect(repeatedRows[1]?.textContent).toContain("Header");

    dispose();
  });

  it("renders page and surface dimensions from document page settings", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([{ text: "Page" }]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph], {
        width: 1056,
        height: 816,
        orientation: "landscape",
        margins: {
          top: 48,
          right: 96,
          bottom: 144,
          left: 120,
          header: 24,
          footer: 36,
          gutter: 10,
        },
      }),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onSurfaceDblClick={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
          onTableDragHandleMouseDown={() => undefined}
          onRevisionMouseEnter={() => undefined}
        />
      ),
      container,
    );

    const page = container.querySelector('[data-testid="editor-2-page"]') as HTMLDivElement;
    const headerZone = container.querySelector('[data-testid="editor-2-page-header-zone"]') as HTMLDivElement;
    const footerZone = container.querySelector('[data-testid="editor-2-page-footer-zone"]') as HTMLDivElement;
    const surface = container.querySelector('[data-testid="editor-2-surface"]') as HTMLDivElement;

    expect(page.style.width).toBe("1056px");
    expect(page.style.minHeight).toBe("816px");
    expect(page.classList.contains("oasis-editor-2-paper-landscape")).toBe(true);
    expect(surface.style.width).toBe("830px");
    expect(surface.style.minHeight).toBe("624px");
    expect(surface.style.marginTop).toBe("48px");
    expect(surface.style.marginRight).toBe("96px");
    expect(surface.style.marginBottom).toBe("144px");
    expect(surface.style.marginLeft).toBe("130px");
    expect(headerZone.style.width).toBe("830px");
    expect(headerZone.style.height).toBe("48px");
    expect(headerZone.style.left).toBe("130px");
    expect(footerZone.style.width).toBe("830px");
    expect(footerZone.style.height).toBe("144px");
    expect(footerZone.style.left).toBe("130px");

    dispose();
  });
});

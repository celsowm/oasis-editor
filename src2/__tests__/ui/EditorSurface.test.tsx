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
import type { Editor2State, Editor2ParagraphNode } from "../../core/model.js";

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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const paragraphElement = container.querySelector(`[data-paragraph-id="${paragraph.id}"]`);
    expect(paragraphElement).not.toBeNull();
    const runs = paragraphElement!.querySelectorAll(".oasis-editor-2-run");
    expect(runs.length).toBe(2);
    expect(runs[0]!.textContent).toBe("ab");
    expect(runs[1]!.textContent).toBe("cd");

    dispose();
  });

  it("renders a multi-line paragraph with multiple DOM runs per line", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "line1\n", styles: { bold: true } },
      { text: "line2", styles: { italic: true } },
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const paragraphElement = container.querySelector(`[data-paragraph-id="${paragraph.id}"]`);
    expect(paragraphElement).not.toBeNull();
    const lines = paragraphElement!.querySelectorAll(".oasis-editor-2-line");
    expect(lines.length).toBe(2);
    expect(lines[0]!.querySelectorAll(".oasis-editor-2-run").length).toBe(1);
    expect(lines[1]!.querySelectorAll(".oasis-editor-2-run").length).toBe(1);

    dispose();
  });

  it("renders a table with rows and cells", () => {
    const container = document.createElement("div");
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "c1" }])]),
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "c2" }])]),
      ]),
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const tableElement = container.querySelector(`[data-table-id="${table.id}"]`);
    expect(tableElement).not.toBeNull();
    const rows = tableElement!.querySelectorAll(".oasis-editor-2-table-row");
    expect(rows.length).toBe(1);
    const cells = rows[0]!.querySelectorAll(".oasis-editor-2-table-cell");
    expect(cells.length).toBe(2);

    dispose();
  });

  it("renders a table with colSpan", () => {
    const container = document.createElement("div");
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "span" }])], 2),
      ]),
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const cellElement = container.querySelector(".oasis-editor-2-table-cell") as HTMLElement;
    expect(cellElement).not.toBeNull();
    expect(cellElement.style.gridColumnEnd).toBe("span 2");

    dispose();
  });

  it("renders a table with rowSpan", () => {
    const container = document.createElement("div");
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "span" }])], 1, {
          rowSpan: 2,
          vMerge: "restart",
        }),
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "c2" }])]),
      ]),
      createEditor2TableRow([
        createEditor2TableCell([], 1, "continue"),
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "c4" }])]),
      ]),
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const cellElement = container.querySelector(".oasis-editor-2-table-cell") as HTMLElement;
    expect(cellElement).not.toBeNull();
    expect(cellElement.style.gridRowEnd).toBe("span 2");

    dispose();
  });

  it("renders a table with vMerge continue (placeholder)", () => {
    const container = document.createElement("div");
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "span" }])], 1, {
          rowSpan: 2,
          vMerge: "restart",
        }),
      ]),
      createEditor2TableRow([createEditor2TableCell([], 1, "continue")]),
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const cells = container.querySelectorAll(".oasis-editor-2-table-cell");
    expect(cells.length).toBe(2);
    expect((cells[1] as HTMLElement).classList.contains("oasis-editor-2-table-cell-placeholder")).toBe(true);

    dispose();
  });

  it("applies paragraph styles to the line container", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([{ text: "styled" }]);
    paragraph.style = { align: "center" };
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const line = container.querySelector(".oasis-editor-2-line") as HTMLElement;
    expect(line.style.textAlign).toBe("center");

    dispose();
  });

  it("renders selection boxes", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([{ text: "selection" }]);
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const selectionBox = {
      left: 10,
      top: 20,
      width: 30,
      height: 40,
      pageIndex: 0,
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          selectionBoxes={() => [selectionBox]}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const boxElement = container.querySelector(".oasis-editor-2-selection-box") as HTMLElement;
    expect(boxElement).not.toBeNull();
    expect(boxElement.style.left).toBe("10px");
    expect(boxElement.style.top).toBe("20px");
    expect(boxElement.style.width).toBe("30px");
    expect(boxElement.style.height).toBe("40px");

    dispose();
  });

  it("renders the caret", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([{ text: "caret" }]);
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
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const caretBox = {
      left: 50,
      top: 60,
      height: 20,
      visible: true,
      pageIndex: 0,
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          caretBox={() => caretBox}
          showCaret={() => true}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const caretElement = container.querySelector(".oasis-editor-2-caret") as HTMLElement;
    expect(caretElement).not.toBeNull();
    expect(caretElement.style.left).toBe("50px");
    expect(caretElement.style.top).toBe("60px");
    expect(caretElement.style.height).toBe("20px");

    dispose();
  });

  it("highlights the active cell in a table", () => {
    const container = document.createElement("div");
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "c1" }])]),
        createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "c2" }])]),
      ]),
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
          runId: (table.rows[0]!.cells[0]!.blocks[0]! as any).runs[0]!.id,
          offset: 0,
        },
      },
      activeSectionIndex: 0,
      activeZone: "main",
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
          onImageMouseDown={() => undefined}
          onImageResizeHandleMouseDown={() => undefined}
        />
      ),
      container,
    );

    const cells = container.querySelectorAll(".oasis-editor-2-table-cell");
    expect(cells[0]!.classList.contains("oasis-editor-2-table-cell-active")).toBe(true);
    expect(cells[1]!.classList.contains("oasis-editor-2-table-cell-active")).toBe(false);

    dispose();
  });
});

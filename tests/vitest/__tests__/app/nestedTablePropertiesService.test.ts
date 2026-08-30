import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import {
  hasActiveTable,
  readTableProperties,
} from "@/app/services/tablePropertiesService.js";

describe("nested table properties service", () => {
  it("reads the innermost table, row, column, and cell", () => {
    const active = createEditorParagraph("inner");
    const inner = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([active]),
          createEditorTableCell([createEditorParagraph("sibling")]),
        ]),
      ],
      [80, 160],
    );
    inner.style = { width: 240, align: "center" };
    inner.rows[0]!.style = { height: 42, cantSplit: true };
    inner.rows[0]!.cells[0]!.style = {
      width: 80,
      verticalAlign: "middle",
      shading: "#abcdef",
    };

    const outer = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([
          createEditorParagraph("before"),
          inner,
          createEditorParagraph("after"),
        ]),
      ]),
    ]);
    outer.style = { width: 500, align: "right" };

    const base = createEditorStateFromDocument(createEditorDocument([outer]));
    const position = paragraphOffsetToPosition(active, 0);
    const state = {
      ...base,
      activeSectionIndex: 0,
      activeZone: "main" as const,
      selection: { anchor: position, focus: position },
    };

    expect(hasActiveTable(state)).toBe(true);
    const values = readTableProperties(state);
    expect(values).not.toBeNull();
    expect(values?.tableWidth).toBe("240");
    expect(values?.tableAlign).toBe("center");
    expect(values?.rowHeight).toBe("42");
    expect(values?.allowBreakAcrossPages).toBe(false);
    expect(values?.columnWidth).toBe("80");
    expect(values?.cellWidth).toBe("80");
    expect(values?.cellVerticalAlign).toBe("middle");
    expect(values?.shading).toBe("#abcdef");
  });
});

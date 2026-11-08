import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  applyFormula,
  canEvaluateActiveTableFormula,
  evaluateActiveTableFormula,
  formatFormulaResult,
  parseTableFormula,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";

function placeCaretIn(state: EditorState, paragraphId: string): EditorState {
  return {
    ...state,
    selection: {
      anchor: { paragraphId, runId: "", offset: 0 },
      focus: { paragraphId, runId: "", offset: 0 },
    },
  };
}

function text(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

function cellParagraph(textValue: string) {
  return createEditorParagraph(textValue);
}

describe("table formula parsing", () => {
  it("parses a supported function and direction", () => {
    expect(parseTableFormula("=SUM(ABOVE)")).toEqual({
      function: "SUM",
      direction: "ABOVE",
    });
    expect(parseTableFormula("=average(left)")).toEqual({
      function: "AVERAGE",
      direction: "LEFT",
    });
    expect(parseTableFormula("= MAX ( RIGHT )")).toEqual({
      function: "MAX",
      direction: "RIGHT",
    });
  });

  it("rejects unsupported functions and directions", () => {
    expect(parseTableFormula("=POWER(ABOVE)")).toBeNull();
    expect(parseTableFormula("=SUM(ACROSS)")).toBeNull();
    expect(parseTableFormula("plain text")).toBeNull();
    expect(parseTableFormula("=SUM ABOVE")).toBeNull();
  });

  it("rejects formulas without a leading equals", () => {
    expect(parseTableFormula("SUM(ABOVE)")).toBeNull();
  });
});

describe("applyFormula", () => {
  it("computes SUM, AVERAGE, COUNT, MIN, MAX", () => {
    const values = [10, 20, 30];
    expect(applyFormula("SUM", values)).toBe(60);
    expect(applyFormula("AVERAGE", values)).toBe(20);
    expect(applyFormula("COUNT", values)).toBe(3);
    expect(applyFormula("MIN", values)).toBe(10);
    expect(applyFormula("MAX", values)).toBe(30);
  });

  it("handles an empty set for COUNT and zero for aggregate functions", () => {
    expect(applyFormula("COUNT", [])).toBe(0);
    expect(applyFormula("SUM", [])).toBe(0);
    expect(applyFormula("AVERAGE", [])).toBe(0);
    expect(applyFormula("MIN", [])).toBe(0);
    expect(applyFormula("MAX", [])).toBe(0);
  });
});

describe("formatFormulaResult", () => {
  it("keeps integers and trims trailing fractional zeros", () => {
    expect(formatFormulaResult(42)).toBe("42");
    expect(formatFormulaResult(2)).toBe("2");
    expect(formatFormulaResult(10.5)).toBe("10.5");
    expect(formatFormulaResult(1.0)).toBe("1");
  });
});

describe("evaluateActiveTableFormula", () => {
  it("sums the numeric cells above the active cell and writes the result", () => {
    const headerA = cellParagraph("Item");
    const headerB = cellParagraph("Total");
    const row1A = cellParagraph("a");
    const row1B = cellParagraph("10");
    const row2A = cellParagraph("b");
    const row2B = cellParagraph("20");
    const active = cellParagraph("");
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([headerA]),
          createEditorTableCell([headerB]),
        ]),
        createEditorTableRow([
          createEditorTableCell([row1A]),
          createEditorTableCell([row1B]),
        ]),
        createEditorTableRow([
          createEditorTableCell([row2A]),
          createEditorTableCell([row2B]),
        ]),
        createEditorTableRow([
          createEditorTableCell([cellParagraph("c")]),
          createEditorTableCell([active]),
        ]),
      ],
      [120, 160],
    );

    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      active.id,
    );
    expect(canEvaluateActiveTableFormula(state)).toBe(true);

    const next = evaluateActiveTableFormula(state, "=SUM(ABOVE)");
    const read = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    const resultCell = read.rows[3]!.cells[1]!;
    expect(text(resultCell.blocks[0] as EditorParagraphNode)).toBe("30");
  });

  it("averages the cells to the left and writes the result", () => {
    const a = cellParagraph("2");
    const b = cellParagraph("4");
    const active = cellParagraph("");
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([a]),
          createEditorTableCell([b]),
          createEditorTableCell([active]),
        ]),
      ],
      [100, 100, 100],
    );

    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      active.id,
    );
    const next = evaluateActiveTableFormula(state, "=AVERAGE(LEFT)");
    const read = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    const resultCell = read.rows[0]!.cells[2]!;
    expect(text(resultCell.blocks[0] as EditorParagraphNode)).toBe("3");
  });

  it("is a no-op when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canEvaluateActiveTableFormula(state)).toBe(false);
    expect(evaluateActiveTableFormula(state, "=SUM(ABOVE)")).toBe(state);
  });

  it("is a no-op when the formula is unsupported", () => {
    const active = cellParagraph("");
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([cellParagraph("1")]),
          createEditorTableCell([active]),
        ]),
      ],
      [100, 100],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      active.id,
    );
    expect(evaluateActiveTableFormula(state, "not a formula")).toBe(state);
  });

  it("is a no-op when no numeric operands are found in range", () => {
    const active = cellParagraph("");
    const table = createEditorTable(
      [
        createEditorTableRow([
          createEditorTableCell([cellParagraph("abc")]),
          createEditorTableCell([active]),
        ]),
      ],
      [100, 100],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      active.id,
    );
    expect(evaluateActiveTableFormula(state, "=SUM(LEFT)")).toBe(state);
  });
});

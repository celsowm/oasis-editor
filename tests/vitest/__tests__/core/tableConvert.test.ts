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
  convertActiveTableToText,
  canConvertActiveTableToText,
  tableToParagraphs,
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

function tableFixture(): {
  state: EditorState;
  paragraphs: ReturnType<typeof createEditorParagraph>[];
} {
  const paragraphs = ["a", "bb", "ccc", "d"].map(createEditorParagraph);
  const table = createEditorTable(
    [
      createEditorTableRow([
        createEditorTableCell([paragraphs[0]!]),
        createEditorTableCell([paragraphs[1]!]),
      ]),
      createEditorTableRow([
        createEditorTableCell([paragraphs[2]!]),
        createEditorTableCell([paragraphs[3]!]),
      ]),
    ],
    [120, 120],
  );
  const state = placeCaretIn(
    createEditorStateFromDocument(createEditorDocument([table])),
    paragraphs[0]!.id,
  );
  return { state, paragraphs };
}

function text(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

describe("Convert Table to Text", () => {
  it("flattens the table into body paragraphs in document order", () => {
    const { state, paragraphs } = tableFixture();
    expect(canConvertActiveTableToText(state)).toBe(true);

    const next = convertActiveTableToText(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(4);
    blocks.forEach((block, index) => {
      expect(block.type).toBe("paragraph");
      if (block.type === "paragraph") {
        expect(text(block)).toBe(text(paragraphs[index]!));
      }
    });
    // The table is gone.
    expect(blocks.some((b) => b.type === "table")).toBe(false);
  });

  it("places the caret at the start of the first paragraph", () => {
    const { state, paragraphs } = tableFixture();
    const next = convertActiveTableToText(state);
    expect(next.selection.focus.paragraphId).toBe(paragraphs[0]!.id);
    expect(next.selection.focus.offset).toBe(0);
  });

  it("keeps a cell's multiple paragraphs as separate body paragraphs", () => {
    const p1 = createEditorParagraph("first");
    const p2 = createEditorParagraph("second");
    const table = createEditorTable(
      [createEditorTableRow([createEditorTableCell([p1, p2])])],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([table])),
      p1.id,
    );

    const next = convertActiveTableToText(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveProperty("id", p1.id);
    expect(blocks[1]).toHaveProperty("id", p2.id);
  });

  it("is a no-op when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canConvertActiveTableToText(state)).toBe(false);
    expect(convertActiveTableToText(state)).toBe(state);
  });

  it("tableToParagraphs clones cell paragraphs without sharing run bases", () => {
    const p = createEditorParagraph("x");
    const table = createEditorTable(
      [createEditorTableRow([createEditorTableCell([p])])],
      [120],
    );
    const [out] = tableToParagraphs(table) as [EditorParagraphNode];
    expect(out.id).toBe(p.id);
    expect(out).not.toBe(p);
    expect(out.runs[0]).not.toBe(p.runs[0]);
    expect(out.runs[0].text).toBe("x");
  });

  it("converts nested cell content down to the active innermost table", () => {
    const outer = createEditorParagraph("a");
    const innerP = createEditorParagraph("b");
    const innerTable = createEditorTable(
      [createEditorTableRow([createEditorTableCell([innerP])])],
      [120],
    );
    const outerTable = createEditorTable(
      [createEditorTableRow([createEditorTableCell([outer, innerTable])])],
      [120],
    );
    const state = placeCaretIn(
      createEditorStateFromDocument(createEditorDocument([outerTable])),
      innerP.id,
    );

    expect(canConvertActiveTableToText(state)).toBe(true);
    const next = convertActiveTableToText(state);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    // Outer table remains; the inner table was replaced by a paragraph.
    expect(blocks[0]).toHaveProperty("type", "table");
    const outerAfter = blocks[0] as EditorTableNode;
    const innerBlocks = outerAfter.rows[0]!.cells[0]!.blocks;
    expect(innerBlocks).toHaveLength(2);
    expect(innerBlocks[0]).toHaveProperty("type", "paragraph");
    expect(innerBlocks[1]).toHaveProperty("type", "paragraph");
  });
});

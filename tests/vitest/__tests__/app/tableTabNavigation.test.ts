import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument, createEditorTable, createEditorTableCell, createEditorTableRow } from "@/core/editorState.js";
import { getDocumentSectionsCanonical, getParagraphLength, getParagraphText, paragraphOffsetToPosition, type EditorState, type EditorTableNode } from "@/core/model.js";
import { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";
import { insertTextAtSelection, deleteBackward, insertPlainTextAtSelection } from "@/core/commands/text.js";
import { stepTabParagraphIndent } from "@/core/commands/paragraphTabIndent.js";

function fixture() {
  const a = createEditorParagraph("A");
  const b = createEditorParagraph("Second");
  const c = createEditorParagraph("paragraph");
  const d = createEditorParagraph("D");
  const table = createEditorTable([
    createEditorTableRow([createEditorTableCell([a]), createEditorTableCell([b, c])]),
    createEditorTableRow([createEditorTableCell([createEditorParagraph("C")]), createEditorTableCell([d])]),
  ]);
  const base = createEditorStateFromDocument(createEditorDocument([table]));
  const position = paragraphOffsetToPosition(a, 0);
  const state: EditorState = { ...base, selection: { anchor: position, focus: position } };
  const ops = createEditorTableOperations({
    applyTransactionalState: () => undefined,
    applySelectionToStatePreservingStructure: (s, selection) => ({ ...s, selection }),
    focusInput: () => undefined,
  });
  const root = (s: EditorState) => getDocumentSectionsCanonical(s.document)[0]!.blocks[0] as EditorTableNode;
  return { a, b, c, d, state, ops, root };
}

describe("Word-style table Tab", () => {
  it("selects all paragraphs of next cell and selects previous cell on reverse", () => {
    const f = fixture();
    const next = f.ops.resolveTableTabTarget(f.state.document, f.a.id, 1);
    expect(next).toEqual({ kind: "adjacent", selection: {
      anchor: paragraphOffsetToPosition(f.b, 0), focus: paragraphOffsetToPosition(f.c, getParagraphLength(f.c)),
    } });
    const prev = f.ops.resolveTableTabTarget(f.state.document, f.c.id, -1);
    expect(prev).toEqual({ kind: "adjacent", selection: {
      anchor: paragraphOffsetToPosition(f.a, 0), focus: paragraphOffsetToPosition(f.a, 1),
    } });
    expect(f.ops.resolveTableTabTarget(f.state.document, f.a.id, -1)).toEqual({kind: "beforeFirst"});
  });
  it("replaces selected multi-paragraph cell text without changing sibling cells", () => {
    const f = fixture();
    const target = f.ops.resolveTableTabTarget(f.state.document, f.a.id, 1);
    if (target.kind !== "adjacent") throw new Error("missing selection");
    const edited = f.ops.applyTableAwareParagraphEdit({ ...f.state, selection: target.selection }, s => insertTextAtSelection(s, "new"));
    const rows = f.root(edited).rows;
    expect(rows[0]!.cells[1]!.blocks).toHaveLength(1);
    expect(getParagraphText(rows[0]!.cells[1]!.blocks[0] as typeof f.b)).toBe("new");
    expect(getParagraphText(rows[1]!.cells[1]!.blocks[0] as typeof f.d)).toBe("D");
    expect(f.root(f.state).rows[0]!.cells[1]!.blocks).toHaveLength(2);
  });
  it("appends one row and selects its first empty cell without mutating original", () => {
    const f = fixture();
    const pos = paragraphOffsetToPosition(f.d, 1);
    const selected = {...f.state, selection: {anchor: pos, focus: pos}};
    expect(f.ops.resolveTableTabTarget(selected.document, f.d.id, 1)).toEqual({kind: "afterLast"});
    const result = f.ops.appendTableRowForTab(selected);
    const rows = f.root(result).rows;
    expect(rows).toHaveLength(3);
    expect(rows[2]!.cells).toHaveLength(2);
    expect(result.selection.focus.paragraphId).toBe(rows[2]!.cells[0]!.blocks[0]!.id);
    expect(result.selection.anchor).toEqual(result.selection.focus);
    expect(f.root(selected).rows).toHaveLength(2);
  });
});


describe("multi-cell formatting projections", () => {
  it("retains the custom tab interval and inherited paragraph indents", () => {
    const f = fixture();
    let current = {
      ...f.state,
      document: {
        ...f.state.document,
        settings: {...f.state.document.settings,defaultTabStop:72},
        styles: {...f.state.document.styles, CellIndent: {id:"CellIndent",name:"CellIndent",type:"paragraph" as const,paragraphStyle:{indentLeft:20}}},
      },
      selection: {anchor:paragraphOffsetToPosition(f.a,0),focus:paragraphOffsetToPosition(f.c,getParagraphLength(f.c))},
    };
    // The first selected paragraph inherits a nonzero indent; the others start at zero.
    const first = f.root(current).rows[0]!.cells[0]!.blocks[0]!;
    if (first.type !== "paragraph") throw new Error("missing paragraph");
    first.style = {styleId:"CellIndent"};
    const ops = createEditorTableOperations({
      applyTransactionalState: producer => { current = producer(current) as typeof current; },
      applySelectionToStatePreservingStructure:(s,selection)=>({...s,selection}),
      focusInput:()=>undefined,
    });
    ops.applySelectionAwareParagraphCommand(s=>stepTabParagraphIndent(s,1));
    const row = f.root(current).rows[0]!;
    expect((row.cells[0]!.blocks[0] as typeof f.a).style?.indentLeft).toBe(116);
    expect((row.cells[1]!.blocks[0] as typeof f.b).style?.indentLeft).toBe(96);
    expect((row.cells[1]!.blocks[1] as typeof f.c).style?.indentLeft).toBe(96);
    expect((f.root(current).rows[1]!.cells[1]!.blocks[0] as typeof f.d).style?.indentLeft??0).toBe(0);
    expect(current.document.settings.defaultTabStop).toBe(72);
  });
});


describe("keyboard editing around table boundaries", () => {
  it("inserts paragraphs before a table without moving cell content or trailing paragraphs", () => {
    const f = fixture();
    const before = createEditorParagraph("abcd");
    const after = createEditorParagraph("after");
    const table = f.root(f.state);
    const base = createEditorStateFromDocument(createEditorDocument([before,table,after]));
    const caret = paragraphOffsetToPosition(before,2);
    const selected = {...base,selection:{anchor:caret,focus:caret}};
    const result = f.ops.applyTableAwareParagraphEdit(selected,s=>insertPlainTextAtSelection(s,"\n"));
    const blocks = getDocumentSectionsCanonical(result.document)[0]!.blocks;
    expect(blocks.map(b=>b.type)).toEqual(["paragraph","paragraph","table","paragraph"]);
    expect(getParagraphText(blocks[0] as typeof before)).toBe("ab");
    expect(getParagraphText(blocks[1] as typeof before)).toBe("cd");
    expect(blocks[2]).toBe(table);
    expect(blocks[3]).toBe(after);
  });
  it("does not merge a paragraph after a table into the preceding cell on Backspace", () => {
    const f = fixture();
    const after = createEditorParagraph("after");
    const base = createEditorStateFromDocument(createEditorDocument([f.root(f.state),after]));
    const caret = paragraphOffsetToPosition(after,0);
    const selected = {...base,selection:{anchor:caret,focus:caret}};
    expect(f.ops.applyTableAwareParagraphEdit(selected,deleteBackward)).toBe(selected);
  });
  it("preserves a nested table when splitting text in its outer cell", () => {
    const f = fixture();
    const before = createEditorParagraph("abcd");
    const after = createEditorParagraph("after");
    const nested = f.root(f.state);
    const outer = createEditorTable([createEditorTableRow([createEditorTableCell([before,nested,after])])]);
    const base = createEditorStateFromDocument(createEditorDocument([outer]));
    const caret = paragraphOffsetToPosition(before,2);
    const result = f.ops.applyTableAwareParagraphEdit({...base,selection:{anchor:caret,focus:caret}},s=>insertPlainTextAtSelection(s,"\n"));
    const blocks = f.root(result).rows[0]!.cells[0]!.blocks;
    expect(blocks.map(b=>b.type)).toEqual(["paragraph","paragraph","table","paragraph"]);
    expect(getParagraphText(blocks[0] as typeof before)).toBe("ab");
    expect(getParagraphText(blocks[1] as typeof before)).toBe("cd");
    expect(blocks[2]).toBe(nested);
    expect(blocks[3]).toBe(after);
  });
  it("rejects cross-table text replacement in either selection direction", () => {
    const f = fixture();
    const after = createEditorParagraph("after");
    const base = createEditorStateFromDocument(createEditorDocument([f.root(f.state),after]));
    const a = paragraphOffsetToPosition(f.a,0), b = paragraphOffsetToPosition(after,2);
    for (const selection of [{anchor:a,focus:b},{anchor:b,focus:a}]) {
      const selected = {...base,selection};
      expect(f.ops.applyTableAwareParagraphEdit(selected,s=>insertTextAtSelection(s,"\t"))).toBe(selected);
    }
  });
});

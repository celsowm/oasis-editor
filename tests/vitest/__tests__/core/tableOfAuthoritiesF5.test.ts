import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, getParagraphText, paragraphOffsetToPosition, type EditorParagraphNode, type EditorState, type EditorTextRun } from "@/core/model.js";
import { parseTaInstruction, collectTaOccurrences } from "@/core/document/toaEntries.js";
import { buildToaPlan, parseToaInstruction } from "@/core/document/toaPlan.js";
import { findQualifiedToaRegion, refreshTableOfAuthorities } from "@/core/document/toaRefresh.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";
import {
  canMarkAuthorityEntry, canInsertTableOfAuthorities, canUpdateTableOfAuthorities,
  insertTableOfAuthorities, markAuthorityEntry, updateTableOfAuthorities,
} from "@/core/commands/tableOfAuthorities.js";

const ctrl = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });
const hidden = (run: EditorTextRun): EditorTextRun => ({ ...run, styles: { hidden: true } });

function fixture(raw = ' TOA \\c "1" \\h ') {
  const intro = createEditorParagraph("Autoridades");
  const begin = createEditorParagraph(""); begin.runs = [ctrl("ib", "begin"), instr("ii", raw), ctrl("is", "separate")];
  const stale = createEditorParagraph("Antigo 99");
  const end = createEditorParagraph(""); end.runs = [ctrl("ie", "end")];
  const body = createEditorParagraph("Barber v. Alboni e Smith v. Jones");
  const fields = [
    ' TA \\l "Barber v. Alboni" \\s "Barber" \\c 1 ',
    ' TA \\l "Smith v. Jones" \\c 1 \\b ',
    ' TA \\l "Outra" \\c 2 ',
  ];
  fields.forEach((f, i) => body.runs.push(hidden(ctrl("b" + i, "begin")), hidden(instr("i" + i, f)), hidden(ctrl("e" + i, "end"))));
  const document = createEditorDocument([intro, begin, stale, end, body]);
  return { state: createEditorStateFromDocument(document), begin, stale, end, body };
}
function cache(state: EditorState): EditorParagraphNode[] {
  const blocks = getDocumentSections(state.document)[0]!.blocks, region = findQualifiedToaRegion(blocks)!;
  return blocks.slice(region.start + 1, region.end).filter(b => b.type === "paragraph");
}

describe("F5 TA/TOA grammar and plan", () => {
  it("parses documented TA and TOA switches and refuses unsupported ones", () => {
    const ta = parseTaInstruction(' TA \\l "Barber v. Alboni" \\s "Barber" \\c 1 \\b \\i ')!;
    expect(ta).toMatchObject({ long: "Barber v. Alboni", short: "Barber", category: "1", boldPage: true, italicPage: true });
    expect(parseTaInstruction(' TA \\l "X" \\f A ')).toBeUndefined();
    expect(parseTaInstruction(' TA \\l "X" \\l "Y" ')).toBeUndefined();
    const toa = parseToaInstruction(' TOA \\c "2" \\p \\h \\e ": " \\s Chapter \\d "/" ')!;
    expect(toa).toMatchObject({ category: "2", passim: true, includeHeading: true, entrySeparator: ": ", seqIdentifier: "Chapter", seqSeparator: "/" });
    expect(parseToaInstruction(" TOA ")).toBeUndefined();
    expect(parseToaInstruction(" TOA \\c 1 \\n ")).toBeUndefined();
  });

  it("builds a sorted plan from point citations only", () => {
    const { state } = fixture(' TOA \\c "1" \\h ');
    const blocks = getDocumentSections(state.document)[0]!.blocks;
    const region = findQualifiedToaRegion(blocks)!;
    const plan = buildToaPlan(state.document, projectDocumentLayout(state.document), region.raw, "en-US")!;
    expect(plan.entries.map(e => e.label)).toEqual(["Barber", "Smith v. Jones"]);
    expect(plan.entries[0]!.pages[0]!.label).toBe("1");
    expect(buildToaPlan(state.document, projectDocumentLayout(state.document), region.raw)).toBeUndefined();
  });
});

describe("F5 TOA regeneration", () => {
  it("renders category heading and short citations with page emphasis", () => {
    const { state, begin, end, body } = fixture(), before = JSON.stringify(state);
    const result = refreshTableOfAuthorities(state, "en-US");
    expect(result.status).toBe("updated");
    const lines = cache(result.state).map(getParagraphText);
    expect(lines).toEqual(["1", "Barber\t1", "Smith v. Jones\t1"]);
    expect(cache(result.state)[2]!.runs.at(-1)).toMatchObject({ text: "1", styles: { bold: true } });
    for (const original of [begin, end, body]) expect(getDocumentSections(result.state.document)[0]!.blocks.find(b => b.id === original.id)).toEqual(original);
    expect(result.state.selection).toBe(state.selection);
    expect(JSON.stringify(state)).toBe(before);
    expect(refreshTableOfAuthorities(result.state, "en-US")).toMatchObject({ status: "unchanged", state: result.state });
  });

  it("refuses locked regions, nonconvergence and unresolved locales", () => {
    const { state } = fixture();
    expect(refreshTableOfAuthorities(state, "en-US", undefined, 1)).toMatchObject({ state, status: "nonconvergent" });
    expect(refreshTableOfAuthorities(state)).toMatchObject({ state, status: "unresolved" });
    const locked = fixture(' TOA \\c "1" ').state;
    const region = findQualifiedToaRegion(getDocumentSections(locked.document)[0]!.blocks)!;
    const blocks = getDocumentSections(locked.document)[0]!.blocks as EditorParagraphNode[];
    blocks[region.start]!.runs[0] = { ...blocks[region.start]!.runs[0]!, fieldChar: { kind: "begin", fieldLock: true } } as EditorTextRun;
    expect(refreshTableOfAuthorities(locked, "en-US")).toMatchObject({ state: locked, status: "unsupported" });
  });

  it("marks TA entries and inserts/updates a TOA transactionally", () => {
    const base = createEditorStateFromDocument(createEditorDocument([createEditorParagraph("Case name")]));
    const pos = paragraphOffsetToPosition(getDocumentSections(base.document)[0]!.blocks[0] as EditorParagraphNode, 9);
    const positioned: EditorState = { ...base, selection: { anchor: pos, focus: pos } };
    expect(canMarkAuthorityEntry(positioned)).toBe(true);
    const marked = markAuthorityEntry(positioned, { long: "Barber v. Alboni", short: "Barber", category: "1" });
    expect(marked).not.toBe(positioned);
    expect(collectTaOccurrences(marked.document)?.map(e => [e.long, e.short])).toEqual([["Barber v. Alboni", "Barber"]]);
    expect(canInsertTableOfAuthorities(marked)).toBe(true);
    const inserted = insertTableOfAuthorities(marked, { locale: "en-US", category: "1", heading: true });
    expect(inserted).not.toBe(marked);
    expect(canUpdateTableOfAuthorities(inserted)).toBe(true);
    // Insertion already published a converged cache, so update is a no-op.
    expect(updateTableOfAuthorities(inserted, "en-US")).toBe(inserted);
    expect(updateTableOfAuthorities(inserted)).toBe(inserted);
    const stale = structuredClone(inserted);
    const blocks = getDocumentSections(stale.document)[0]!.blocks as EditorParagraphNode[];
    const region = findQualifiedToaRegion(blocks)!;
    blocks[region.start + 1]!.runs = [{ id: "stale", kind: "text", text: "Antigo" }];
    expect(updateTableOfAuthorities(stale, "en-US")).not.toBe(stale);
  });
});

import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, getParagraphText, type EditorParagraphNode, type EditorState, type EditorTextRun } from "@/core/model.js";
import { buildIndexPlan, parseIndexInstruction } from "@/core/document/indexPlan.js";
import { findQualifiedIndexRegion, refreshIndexConvergently } from "@/core/document/indexRefresh.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";
import { canUpdateIndex } from "@/core/commands/indexEntries.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

const ctrl = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });

function fixture(raw: string) {
  const begin = createEditorParagraph(""); begin.runs = [ctrl("ib", "begin"), instr("ii", raw), ctrl("is", "separate")];
  const stale = createEditorParagraph("Antigo, 99");
  const end = createEditorParagraph(""); end.runs = [ctrl("ie", "end")];
  const body = createEditorParagraph("Conteúdo");
  [' XE "Água" ', ' XE "Bico" ', ' XE "Cadeira" ', ' XE "Dado" '].forEach((f, i) =>
    body.runs.push(ctrl("b" + i, "begin"), instr("i" + i, f), ctrl("e" + i, "end")));
  const seq = createEditorParagraph(""); seq.runs = [ctrl("sb", "begin"), instr("si", " SEQ Chapter "), ctrl("ss", "separate"),
    { id: "sr", kind: "text", text: "3" }, ctrl("se", "end")];
  return createEditorStateFromDocument(createEditorDocument([begin, stale, end, body, seq]));
}
function cache(state: EditorState): EditorParagraphNode[] {
  const blocks = getDocumentSections(state.document)[0]!.blocks, region = findQualifiedIndexRegion(blocks)!;
  return blocks.slice(region.start + 1, region.end).filter(b => b.type === "paragraph");
}

describe("F10 advanced INDEX grammar", () => {
  it("parses columns, heading, run-in, letter range, sequence prefix and yomi", () => {
    expect(parseIndexInstruction(' INDEX \\c "4" \\z "1046" \\p "a-m" \\r \\y ')).toMatchObject({
      columns: 4, locale: "pt-BR", letterRange: "a-m", runIn: true, yomi: true,
    });
    expect(parseIndexInstruction(' INDEX \\h "Autoridades" \\s Chapter \\d "/" ')).toMatchObject({
      heading: "Autoridades", seqIdentifier: "Chapter", seqSeparator: "/",
    });
    expect(parseIndexInstruction(' INDEX \\c 5 ')).toBeUndefined();
    expect(parseIndexInstruction(' INDEX \\h "x" \\h "y" ')).toBeUndefined();
    expect(parseIndexInstruction(' INDEX \\p "m-a" ')).toBeUndefined();
    expect(parseIndexInstruction(" INDEX \\b Bookmark ")).toMatchObject({ bookmark: "Bookmark" });
  });

  it("resolves the SEQ prefix into the read-only plan", () => {
    const raw = ' INDEX \\z "1046" \\s Chapter \\d "/" ';
    const state = fixture(raw);
    const layout = projectDocumentLayout(state.document);
    const plan = buildIndexPlan(state.document, layout, raw)!;
    expect(plan.settings.seqPrefix).toBe("3/");
    expect(plan.entries.every(e => e.path[0] === "Água" || e.path.length === 1)).toBe(true);
  });
});

describe("F10 advanced INDEX regeneration", () => {
  it("uses a real continuous two-column section and an Index Heading", async () => {
    const state = fixture(' INDEX \\c "2" \\z "1046" \\h "Autoridades" ');
    const result = refreshIndexConvergently(state);
    expect(result.status).toBe("updated");
    const sections = getDocumentSections(result.state.document);
    const indexSection = sections.find(s => s.breakType === "continuous");
    expect(indexSection?.pageSettings.columns).toMatchObject({ count: 2 });
    const blocks = indexSection!.blocks as EditorParagraphNode[];
    const start = blocks.findIndex(b => b.runs.some(r => r.kind === "fieldInstruction" && r.fieldInstruction.includes("INDEX")));
    const end = blocks.findIndex((b, i) => i > start && b.runs.some(r => r.kind === "fieldChar" && r.fieldChar.kind === "end"));
    expect(blocks.slice(start + 1, end).map(getParagraphText)).toEqual([
      "Autoridades", "Água, 1", "Bico, 1", "Cadeira, 1", "Dado, 1",
    ]);
    expect(blocks[start + 1]!.style?.styleId).toBe("IndexHeading");
    expect(canUpdateIndex(result.state)).toBe(true);
    expect(refreshIndexConvergently(result.state)).toMatchObject({ status: "unchanged" });
    const reopened = createEditorStateFromDocument(
      await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document)));
    expect(getDocumentSections(reopened.document).some(s =>
      s.pageSettings.columns?.count === 2)).toBe(true);
  });

  it("filters by letter range and joins run-in subentries", () => {
    const filtered = refreshIndexConvergently(fixture(' INDEX \\z "1046" \\p "a-b" '));
    expect(filtered.status).toBe("updated");
    expect(cache(filtered.state).map(getParagraphText)).toEqual(["Água, 1", "Bico, 1"]);
    const runIn = refreshIndexConvergently(fixture(' INDEX \\z "1046" \\r '));
    expect(runIn.status).toBe("updated");
    expect(cache(runIn.state).every(p => (p.style?.indentLeft ?? 0) === 0)).toBe(true);
  });

  it("refuses an out-of-range column count through the authoring gate", () => {
    expect(parseIndexInstruction(' INDEX \\c "9" ')).toBeUndefined();
    const state = fixture(' INDEX \\c "2" \\z "1046" ');
    const result = refreshIndexConvergently(state, undefined, undefined, 1);
    expect(result.status).toBe("nonconvergent");
    expect(result.state).toBe(state);
  });
});

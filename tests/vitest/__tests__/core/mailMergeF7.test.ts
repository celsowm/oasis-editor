import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, getParagraphText, type EditorParagraphNode, type EditorTextRun } from "@/core/model.js";
import { compareOperands } from "@/core/document/fieldComparison.js";
import {
  evaluateMergeControl, parseMergeInstruction, planMailMerge, projectMergeRecord,
  resolveMergeField, type MergeRecord,
} from "@/core/document/mergeFields.js";
import { mergeToNewDocuments, previewMergeRecord } from "@/core/commands/mailMerge.js";

const ctrl = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });
const text = (id: string, value: string): EditorTextRun => ({ id, kind: "text", text: value });
function fieldParagraph(id: string, raw: string, result: string): EditorParagraphNode {
  const p = createEditorParagraph("");
  p.id = id;
  p.runs = [text(id + "pre", "Olá "), ctrl(id + "b", "begin"), instr(id + "i", raw),
    ctrl(id + "s", "separate"), text(id + "r", result), ctrl(id + "e", "end")];
  return p;
}

describe("F7 merge grammar and comparison", () => {
  it("parses MERGEFIELD switches and control commands", () => {
    expect(parseMergeInstruction(' MERGEFIELD Nome \\b "Sr. " \\f "!" \\m \\v ')).toMatchObject({
      type: "MERGEFIELD", name: "Nome", before: "Sr. ", after: "!", mapped: true, vertical: true,
    });
    expect(parseMergeInstruction(" NEXT ")).toEqual({ type: "NEXT" });
    expect(parseMergeInstruction(' NEXTIF MERGEFIELD Cidade = "RJ" ')).toMatchObject({
      type: "NEXTIF", left: { kind: "mergeField", name: "Cidade" }, operator: "=", right: { kind: "literal", value: "RJ" },
    });
    expect(parseMergeInstruction(" SKIPIF Valor < 100 ")).toMatchObject({ type: "SKIPIF", operator: "<" });
    expect(parseMergeInstruction(" MERGEFIELD Nome \\b 'x' ")).toBeUndefined();
    expect(parseMergeInstruction(" NEXTIF Cidade = ")).toBeUndefined();
  });

  it("shares one bounded comparator", () => {
    expect(compareOperands("2", "10", "<")).toBe(true);
    expect(compareOperands("985", "985*", "=")).toBe(true);
    expect(compareOperands("abc", "a?c", "=")).toBe(true);
    expect(compareOperands("abc", "a?c", "<>")).toBe(false);
    expect(compareOperands("abc", "def", ">")).toBeUndefined();
    expect(compareOperands("a".repeat(200), "a*", "=")).toBeUndefined();
  });
});

describe("F7 record projection and planning", () => {
  const record: MergeRecord = { Nome: "Ana", Cidade: "RJ", Valor: "50" };
  it("projects values and evaluates control decisions", () => {
    const merge = parseMergeInstruction(' MERGEFIELD Nome \\b "Sr. " ')!;
    expect(resolveMergeField(merge as never, record)).toBe("Sr. Ana");
    const nextif = parseMergeInstruction(' NEXTIF MERGEFIELD Cidade = "RJ" ')!;
    expect(evaluateMergeControl(nextif as never, record)).toEqual({ advanceInPlace: true, skipDocument: false });
    const skipif = parseMergeInstruction(" SKIPIF Valor < 100 ")!;
    expect(evaluateMergeControl(skipif as never, record)).toEqual({ advanceInPlace: false, skipDocument: true });
  });

  it("replaces cached results without changing the instruction stream", () => {
    const p = fieldParagraph("p1", ' MERGEFIELD Nome ', "Nome");
    const doc = createEditorDocument([p]);
    const before = JSON.stringify(doc);
    const projected = projectMergeRecord(doc, record)!;
    expect(getDocumentSections(projected.document)[0]!.blocks.map(b => getParagraphText(b as EditorParagraphNode))).toEqual(["Olá Ana"]);
    expect((getDocumentSections(projected.document)[0]!.blocks[0] as EditorParagraphNode).runs.map(r =>
      r.kind === "fieldInstruction" ? r.fieldInstruction : r.text)).toEqual([
      "Olá ", "", " MERGEFIELD Nome ", "", "Ana", "",
    ]);
    expect(JSON.stringify(doc)).toBe(before);
  });

  it("groups NEXT records and drops SKIPIF documents", () => {
    const merge = fieldParagraph("m", " MERGEFIELD Nome ", "Nome");
    const next = fieldParagraph("n", " NEXT ", "");
    const state = createEditorStateFromDocument(createEditorDocument([merge, next]));
    const records: MergeRecord[] = [{ Nome: "Ana" }, { Nome: "Bia" }, { Nome: "Caio" }];
    const docs = mergeToNewDocuments(state, records)!;
    expect(docs.length).toBe(1);
    const blocks = getDocumentSections(docs[0]!)[0]!.blocks as EditorParagraphNode[];
    expect(blocks.map(b => getParagraphText(b)))
      .toEqual(["Olá Ana", "Olá Bia", "Olá Caio", "Olá ", "Olá ", "Olá "]);
    expect(blocks[0]!.style?.pageBreakBefore).not.toBe(true);
    expect(blocks[1]!.style?.pageBreakBefore).toBe(true);
    expect(blocks[2]!.style?.pageBreakBefore).toBe(true);
    expect(blocks[4]!.style?.pageBreakBefore).toBe(true);
    const skipped = fieldParagraph("s", " SKIPIF Valor < 100 ", "");
    const withSkip = createEditorStateFromDocument(createEditorDocument([merge, skipped]));
    expect(planMailMerge([
      { Nome: "Ana", Valor: "200" }, { Nome: "Bia", Valor: "50" }, { Nome: "Caio", Valor: "300" },
    ], withSkip.document)?.length).toBe(2);
    const preview = previewMergeRecord(state, records, 1);
    expect(getDocumentSections(preview.document)[0]!.blocks[0]).toBeDefined();
    expect(previewMergeRecord(state, records, 9)).toBe(state);
  });
});

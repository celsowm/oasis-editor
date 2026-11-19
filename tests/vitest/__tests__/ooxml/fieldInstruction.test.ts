import { describe, expect, it } from "vitest";
import { parseFieldInstruction, MAX_FIELD_INSTRUCTION_LENGTH } from "@/ooxml/word/fieldInstruction.js";
import { projectScalarFieldInstruction } from "@/import/docx/runs/fieldProjection.js";
import type { EditorParagraphNode, EditorTextRun } from "@/core/model/types/nodes.js";
import { buildFieldStoryGraph } from "@/core/document/fieldStoryGraph.js";
import { protectedFieldRanges } from "@/core/document/fieldMutation.js";


describe("lossless field instruction lexer",()=>{
  it("preserves raw offsets, command case and quoted operands without promoting words",()=>{
    const raw=String.raw`  iF "NUMPAGES" = "a\"b\\c" \* MERGEFORMAT `;
    const parsed=parseFieldInstruction(raw);
    expect(parsed.command).toBe("IF");
    expect(parsed.raw).toBe(raw);
    expect(parsed.tokens.map(t=>t.value)).toEqual(["iF","NUMPAGES","=",'a"b\\c',"*","MERGEFORMAT"]);
    for(const token of parsed.tokens)expect(raw.slice(token.start,token.end)).toBe(token.raw);
    expect(projectScalarFieldInstruction(raw)).toBeUndefined();
  });
  it("supports case-sensitive page formats and exact reference names",()=>{
    expect(projectScalarFieldInstruction(" page \\* roman ")).toEqual({type:"PAGE",format:"roman"});
    expect(projectScalarFieldInstruction(" NUMPAGES \\* ROMAN ")).toEqual({type:"NUMPAGES",format:"ROMAN"});
    expect(projectScalarFieldInstruction(' REF "NUMPAGES" \\h ')).toEqual({type:"REF",bookmark:"NUMPAGES"});
    expect(projectScalarFieldInstruction(' DATE \\@ "yyyy-MM-dd" ')).toEqual({type:"DATE",dateFormat:"yyyy-MM-dd"});
  });
  it("retains unknown commands and unrepresentable operands",()=>{
    expect(parseFieldInstruction(" INCLUDETEXT file ").command).toBe("INCLUDETEXT");
    for(const raw of [" REF "," PAGE \\* Unknown "," REF X \\n "," DATE \\@ \"x\" \\* MERGEFORMAT "," PAGE extra "," X NUMPAGES "," PAGE \\ "," DATE \\@ \"unterminated","\"PAGE\""]){
      expect(projectScalarFieldInstruction(raw)).toBeUndefined();
    }
  });
  it("bounds parsing while keeping raw input",()=>{
    const raw=" ".repeat(MAX_FIELD_INSTRUCTION_LENGTH+1);
    expect(parseFieldInstruction(raw)).toMatchObject({raw,command:null,error:"length-limit"});
    expect(parseFieldInstruction("IF "+"x ".repeat(4096)).error).toBe("token-limit");
  });
});

const marker = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instruction = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });
const visible = (id: string, text: string): EditorTextRun => ({ id, kind: "text", text });
const paragraph = (id: string, ...runs: EditorTextRun[]): EditorParagraphNode =>
  ({ id, type: "paragraph", runs });

describe("complex field story graph", () => {
  it("retains cross-paragraph coordinates, direct operands and nested results without mutation", () => {
    const paragraphs = [
      paragraph("p1", visible("prefix", "😀"), marker("outer", "begin"), instruction("if", " IF "),
        marker("inner", "begin"), instruction("ref", " REF A "), marker("innerSep", "separate"),
        visible("innerResult", "1"), marker("innerEnd", "end"), instruction("tail", ' = 1 "yes" "no" ')),
      paragraph("p2", marker("outerSep", "separate"), visible("cache", "yes"),
        marker("resultChild", "begin"), instruction("page", " PAGE "), marker("resultEnd", "end")),
      paragraph("p3", visible("more", "!"), marker("outerEnd", "end"), visible("suffix", "after")),
    ];
    const before = JSON.stringify(paragraphs);
    const graph = buildFieldStoryGraph(paragraphs);
    expect(graph.diagnostics).toEqual([]);
    expect(graph.spans.map(s => s.parentIndex)).toEqual([null, 0, 0]);
    const outer = graph.spans[0]!;
    expect(outer.begin).toMatchObject({ paragraphId: "p1", offset: 2, runIndex: 1 });
    expect(outer.separator).toMatchObject({ paragraphId: "p2", offset: 0 });
    expect(outer.end).toMatchObject({ paragraphId: "p3", offset: 1 });
    expect(outer.code.map(p => p.kind === "instruction" ? p.raw : p)).toEqual([
      " IF ", { kind: "nested", fieldIndex: 1 }, ' = 1 "yes" "no" ',
    ]);
    expect(outer.result.map(p => p.kind)).toEqual(["run", "nested", "run"]);
    expect(graph.spans[1]!.result[0]).toMatchObject({ point: { runId: "innerResult" } });
    expect(JSON.stringify(paragraphs)).toBe(before);
  });

  it("reports malformed markers without repairing or matching across stories", () => {
    const p = paragraph("p", marker("orphan", "end"), marker("sep", "separate"),
      instruction("orphanCode", " PAGE "), marker("begin", "begin"), marker("s1", "separate"),
      marker("s2", "separate"), instruction("late", " DATE "));
    expect(buildFieldStoryGraph([p]).diagnostics.map(d => d.kind)).toEqual([
      "orphan-end", "orphan-separator", "orphan-instruction",
      "duplicate-separator", "instruction-after-separator", "unclosed-field",
    ]);
    expect(buildFieldStoryGraph([paragraph("other", marker("end", "end"))]).diagnostics[0]?.kind).toBe("orphan-end");
    expect(protectedFieldRanges(paragraph("bad", marker("b", "begin"), marker("s", "separate"),
      marker("s2", "separate"), marker("e", "end")))).toBeUndefined();
  });

  it("keeps coincident marker identity and instruction-only spans", () => {
    const p = paragraph("p", marker("a", "begin"), instruction("i", " PAGE "), marker("b", "end"),
      marker("c", "begin"), instruction("j", " DATE "), marker("d", "end"));
    const graph = buildFieldStoryGraph([p]);
    expect(graph.diagnostics).toEqual([]);
    expect(graph.spans.map(s => [s.begin.runIndex, s.end?.runIndex])).toEqual([[0, 2], [3, 5]]);
    expect(protectedFieldRanges(p)).toEqual([{ start: 0, end: 0 }, { start: 0, end: 0 }]);
  });

  it("walks deep nesting iteratively", () => {
    const depth = 12000;
    const p = paragraph("p", ...Array.from({length: depth}, (_, i) => marker("b" + i, "begin")),
      instruction("i", " PAGE "), ...Array.from({length: depth}, (_, i) => marker("e" + i, "end")));
    const graph = buildFieldStoryGraph([p]);
    expect(graph.diagnostics).toEqual([]);
    expect(graph.spans).toHaveLength(depth);
    expect(graph.spans[depth - 1]?.parentIndex).toBe(depth - 2);
    expect(graph.spans[0]?.end?.runId).toBe("e" + (depth - 1));
  });
});

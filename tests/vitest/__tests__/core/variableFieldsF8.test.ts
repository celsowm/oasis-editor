import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, type EditorParagraphNode, type EditorTextRun } from "@/core/model.js";
import { evaluateFormula } from "@/core/document/formulaFields.js";
import {
  evaluateVariableInstruction, parseVariableFieldInstruction, refreshVariableFieldCaches,
} from "@/core/document/variableFields.js";

const ctrl = (id: string, kind: "begin" | "separate" | "end", locked = false): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind, fieldLock: locked } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });
function fieldParagraph(id: string, raw: string, result = "", locked = false): EditorParagraphNode {
  const p = createEditorParagraph("");
  p.id = id;
  p.runs = [ctrl(id + "b", "begin", locked), instr(id + "i", raw),
    ctrl(id + "s", "separate"), { id: id + "r", kind: "text", text: result }, ctrl(id + "e", "end")];
  return p;
}
const texts = (state: ReturnType<typeof createEditorStateFromDocument>): string[] =>
  getDocumentSections(state.document)[0]!.blocks.map(b => b.type === "paragraph" ? b.runs.map(r => r.text).join("") : "");

describe("F8 variable field grammar and formula", () => {
  it("parses SET/ASK/FILLIN/COMPARE and formula switches", () => {
    expect(parseVariableFieldInstruction(' SET Total "42" ')).toEqual({ type: "SET", name: "Total", value: "42" });
    expect(parseVariableFieldInstruction(' ASK Nome "Qual nome?" \\d "Ana" \\o ')).toEqual({
      type: "ASK", name: "Nome", prompt: "Qual nome?", defaultValue: "Ana", once: true,
    });
    expect(parseVariableFieldInstruction(' FILLIN "Valor?" \\d "0" ')).toMatchObject({
      type: "FILLIN", prompt: "Valor?", defaultValue: "0", once: false,
    });
    expect(parseVariableFieldInstruction(' COMPARE X > 3 ')).toMatchObject({
      type: "COMPARE", left: "X", operator: ">", right: "3", quoted: [false, false],
    });
    expect(parseVariableFieldInstruction(' = (Unit*2)+3 \\# "$0.00" ')).toMatchObject({
      type: "FORMULA", expression: "(Unit*2)+3", picture: "$0.00",
    });
    expect(parseVariableFieldInstruction(' SET X "1" \\o ')).toBeUndefined();
    expect(parseVariableFieldInstruction(' ASK X "p" \\d "a" \\d "b" ')).toBeUndefined();
  });

  it("evaluates bounded formulas and refuses malformed ones", () => {
    expect(evaluateFormula("(2+3)*4", {})).toBe(20);
    expect(evaluateFormula("2^3", {})).toBe(8);
    expect(evaluateFormula("MOD(7,3)", {})).toBe(1);
    expect(evaluateFormula("ABS(-5)+SUM(1,2,3)", {})).toBe(11);
    expect(evaluateFormula("1=1", {})).toBe(true);
    expect(evaluateFormula("DEFINED(X)", { variables: { x: "2" } })).toBe(1);
    expect(evaluateFormula("X*2", { variables: { x: "4" } })).toBe(8);
    expect(evaluateFormula("X*2", {})).toBeUndefined();
    expect(evaluateFormula("1/0", {})).toBeUndefined();
    expect(evaluateFormula("NOT(A) OR TRUE()", { variables: { a: "0" } })).toBe(true);
  });
});

describe("F8 variable refresh", () => {
  it("threads SET values into COMPARE and evaluates FILLIN with an injected prompt", () => {
    const state = createEditorStateFromDocument(createEditorDocument([
      fieldParagraph("set", ' SET X "5" '),
      fieldParagraph("cmp", " COMPARE X > 3 "),
      fieldParagraph("fill", ' FILLIN "Valor?" '),
      fieldParagraph("calc", " = (X*2)+1 "),
    ]));
    const result = refreshVariableFieldCaches(state, { prompt: () => "7" });
    expect(result.updated).toBe(4);
    expect(texts(result.state)).toEqual(["", "1", "7", "11"]);
    expect(result.variables).toEqual({ x: "5" });
    expect(texts(state)).toEqual(["", "", "", ""]);
  });

  it("uses ASK defaults once and preserves caches without a prompt", () => {
    const state = createEditorStateFromDocument(createEditorDocument([
      fieldParagraph("ask", ' ASK Nome "Nome?" \\d "Ana" \\o '),
      fieldParagraph("cmp", ' COMPARE "Ana" = Nome '),
    ]));
    const prompts: string[] = [];
    const result = refreshVariableFieldCaches(state, { prompt: (p, d) => { prompts.push(p); return d ?? ""; } });
    expect(texts(result.state)).toEqual(["", "1"]);
    expect(prompts).toEqual(["Nome?"]);
    // Without a prompt resolver ASK is preserved; COMPARE still resolves
    // against its plain literal operands.
    expect(refreshVariableFieldCaches(state)).toMatchObject({ updated: 1 });
  });

  it("honors numeric pictures and locked markers", () => {
    const state = createEditorStateFromDocument(createEditorDocument([
      fieldParagraph("calc", ' = 12.5 \\# "$0.00" '),
      fieldParagraph("locked", " COMPARE 1 = 1 ", "cache", true),
    ]));
    const result = refreshVariableFieldCaches(state);
    expect(texts(result.state)).toEqual(["$12.50", "cache"]);
    expect(result.updated).toBe(1);
  });

  it("evaluates one instruction directly with a record", () => {
    const inst = parseVariableFieldInstruction(" COMPARE Codigo = 985* ")!;
    expect(evaluateVariableInstruction(inst, { record: { Codigo: "98512" } }, {}, "0")).toMatchObject({ text: "1" });
  });
});

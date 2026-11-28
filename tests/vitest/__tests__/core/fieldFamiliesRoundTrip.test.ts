import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, type EditorParagraphNode, type EditorTextRun } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { isLegacyFormInstruction, parseFfData } from "@/ooxml/word/legacyFormFields.js";
import { DOMParser } from "@xmldom/xmldom";

const ctrl = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });

describe("field family DOCX preservation", () => {
  it("round-trips advanced instructions and legacy ffData without execution", async () => {
    const ffData = parseFfData(new DOMParser().parseFromString(
      `<w:ffData xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:name w:val="Nome"/><w:textInput w:maxLength="20"/></w:ffData>`,
      "application/xml").documentElement!,
    )!;
    const formBegin: EditorTextRun = {
      id: "fb", kind: "fieldChar", text: "", fieldChar: { kind: "begin", formField: ffData },
    };
    const rows: EditorParagraphNode[] = [
      { ...createEditorParagraph(""), id: "ta", runs: [ctrl("tab", "begin"), instr("tai", ' TA \\l "Barber" \\c 1 '), ctrl("tae", "end")] },
      { ...createEditorParagraph(""), id: "toa", runs: [ctrl("toab", "begin"), instr("toai", ' TOA \\c "1" \\h \\p '), ctrl("toas", "separate"),
        { id: "toar", kind: "text", text: "Barber\t1" }, ctrl("toae", "end")] },
      { ...createEditorParagraph(""), id: "merge", runs: [ctrl("mb", "begin"), instr("mi", ' MERGEFIELD Nome \\b "Sr. " '), ctrl("ms", "separate"),
        { id: "mr", kind: "text", text: "Nome" }, ctrl("me", "end")] },
      { ...createEditorParagraph(""), id: "set", runs: [ctrl("setb", "begin"), instr("seti", ' SET X "5" '), ctrl("sets", "separate"), ctrl("sete", "end")] },
      { ...createEditorParagraph(""), id: "form", runs: [formBegin, instr("fi", " FORMTEXT "), ctrl("fs", "separate"),
        { id: "fr", kind: "text", text: "" }, ctrl("fe", "end")] },
    ];
    const state = createEditorStateFromDocument(createEditorDocument(rows));
    const before = JSON.stringify(state.document);
    const reopened = createEditorStateFromDocument(await importDocxToEditorDocument(await exportEditorDocumentToDocx(state.document)));
    const runs = getDocumentSections(reopened.document).flatMap(section => section.blocks)
      .flatMap(block => block.type === "paragraph" ? block.runs : []);
    const instructions = runs.flatMap(run => run.kind === "fieldInstruction" ? [run.fieldInstruction] : []);
    for (const raw of [' TA \\l "Barber" \\c 1 ', ' TOA \\c "1" \\h \\p ', ' MERGEFIELD Nome \\b "Sr. " ', ' SET X "5" ', " FORMTEXT "]) {
      expect(instructions.some(value => value.includes(raw.trim())), raw).toBe(true);
    }
    expect(isLegacyFormInstruction(" FORMTEXT ")).toBe(true);
    expect(runs.some(run => run.kind === "fieldChar" && run.fieldChar.formField?.name === "Nome")).toBe(true);
    expect(JSON.stringify(state.document)).toBe(before);
  });
});

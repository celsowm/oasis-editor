import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, type EditorParagraphNode, type EditorTextRun } from "@/core/model.js";
import { isLegacyFormInstruction, parseFfData, serializeFfData } from "@/ooxml/word/legacyFormFields.js";
import { listLegacyFormFields, setFormFieldValue, toggleFormCheckbox } from "@/core/commands/legacyForms.js";
import { serializeFieldCharRun } from "@/export/docx/text/fieldRunXml.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const ff = (xml: string) => new DOMParser().parseFromString(
  `<w:fldChar xmlns:w="${WORD_NS}" w:fldCharType="begin">${xml}</w:fldChar>`, "application/xml").documentElement!.firstChild! as never;

describe("F9 ffData grammar", () => {
  it("reads TEXTINPUT / CHECKBOX / DDLIST with bounded metadata", () => {
    const text = parseFfData(ff(`<w:ffData><w:name w:val="Nome"/><w:enabled/><w:calcOnExit w:val="true"/>
      <w:textInput w:type="regular" w:maxLength="20"><w:default w:val="Ana"/></w:textInput>
      <w:helpText w:val="Ajuda"/><w:statusText w:val="Estado"/><w:entryMacro>Macro</w:entryMacro></w:ffData>`))!;
    expect(text).toMatchObject({ name: "Nome", control: "text", value: "Ana", enabled: true,
      calcOnExit: true, helpText: "Ajuda", statusText: "Estado", entryMacro: "Macro",
      textInput: { default: "Ana", maxLength: 20, type: "regular" } });
    const check = parseFfData(ff(`<w:ffData><w:name w:val="Ok"/><w:checkBox><w:checked w:val="1"/><w:default w:val="0"/><w:size w:val="20"/></w:checkBox></w:ffData>`))!;
    expect(check).toMatchObject({ control: "checkBox", value: "x", checkBox: { checked: true, default: false, size: 20 } });
    const list = parseFfData(ff(`<w:ffData><w:name w:val="UF"/><w:ddList><w:listEntry w:val="RJ"/><w:listEntry w:val="SP"/><w:defaultResult w:val="RJ"/></w:ddList></w:ffData>`))!;
    expect(list).toMatchObject({ control: "dropDown", value: "RJ", ddList: { defaultResult: "RJ", listEntries: ["RJ", "SP"] } });
  });

  it("rejects invalid metadata and preserves legacy instruction heads", () => {
    expect(parseFfData(ff(`<w:ffData><w:name w:val="x"/><w:textInput/><w:checkBox/></w:ffData>`))).toBeUndefined();
    expect(parseFfData(ff(`<w:ffData><w:name w:val="x"/><w:textInput w:maxLength="40000"/></w:ffData>`))).toBeUndefined();
    expect(parseFfData(ff(`<w:ffData><w:name w:val="x"/><w:label w:val="ignored"/><w:textInput/></w:ffData>`))).toBeUndefined();
    expect(isLegacyFormInstruction(" FORMTEXT ")).toBe(true);
    expect(isLegacyFormInstruction(" FORMCHECKBOX ")).toBe(true);
    expect(isLegacyFormInstruction(" MERGEFIELD X ")).toBe(false);
  });

  it("serializes round-trippable ffData without executing macros", () => {
    const data = parseFfData(ff(`<w:ffData><w:name w:val="Nome"/><w:textInput/><w:exitMacro>Macro2</w:exitMacro></w:ffData>`))!;
    const xml = serializeFieldCharRun({ kind: "begin", formField: data }, "");
    expect(xml).toContain("<w:ffData>");
    expect(xml).toContain("<w:exitMacro>Macro2</w:exitMacro>");
    const wrapped = new DOMParser().parseFromString(`<root xmlns:w="${WORD_NS}">${xml}</root>`, "application/xml").documentElement!;
    const reparsed = parseFfData(wrapped.firstChild!.firstChild!.firstChild! as never);
    expect(reparsed).toEqual(data);
  });
});

describe("F9 form editing", () => {
  function fixture() {
    const ctrl = (id: string, kind: "begin" | "separate" | "end", formField?: ReturnType<typeof parseFfData>): EditorTextRun =>
      ({ id, kind: "fieldChar", text: "", fieldChar: { kind, ...(formField ? { formField } : {}) } });
    const data = parseFfData(ff(`<w:ffData><w:name w:val="Nome"/><w:textInput w:maxLength="20"/></w:ffData>`))!;
    const check = parseFfData(ff(`<w:ffData><w:name w:val="Ok"/><w:checkBox/></w:ffData>`))!;
    const p: EditorParagraphNode = { ...createEditorParagraph(""), id: "formParagraph", runs: [
      ctrl("b", "begin", data), { id: "i", kind: "fieldInstruction", text: "", fieldInstruction: " FORMTEXT " },
      ctrl("s", "separate"), { id: "r", kind: "text", text: "" }, ctrl("e", "end"),
      ctrl("b2", "begin", check), { id: "i2", kind: "fieldInstruction", text: "", fieldInstruction: " FORMCHECKBOX " },
      ctrl("s2", "separate"), { id: "r2", kind: "text", text: "" }, ctrl("e2", "end"),
    ] };
    return createEditorStateFromDocument(createEditorDocument([p]));
  }

  it("writes values through commands and validates the control domain", () => {
    const state = fixture();
    expect(listLegacyFormFields(state).map(f => [f.name, f.control])).toEqual([["Nome", "text"], ["Ok", "checkBox"]]);
    const next = setFormFieldValue(state, "Nome", "Bruno");
    expect(next).not.toBe(state);
    const p = getDocumentSections(next.document)[0]!.blocks[0] as EditorParagraphNode;
    expect(p.runs.find(r => r.id === "r")).toMatchObject({ text: "Bruno" });
    expect(p.runs.find(r => r.id === "b")).toMatchObject({ fieldChar: { formField: { value: "Bruno" } } });
    expect(setFormFieldValue(state, "Nome", "x".repeat(21))).toBe(state);
    expect(setFormFieldValue(state, "Desconhecido", "x")).toBe(state);
    const checked = toggleFormCheckbox(next, "Ok");
    expect((getDocumentSections(checked.document)[0]!.blocks[0] as EditorParagraphNode).runs.find(r => r.id === "r2")).toMatchObject({ text: "x" });
    expect(toggleFormCheckbox(checked, "Ok")).not.toBe(checked);
    expect(toggleFormCheckbox(state, "Nome")).toBe(state);
  });
});

import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph} from "@/core/editorState.js";
import {getDocumentSections,type EditorTextRun} from "@/core/model.js";
import {parseTcInstruction,collectTcOccurrences,resolveTcPageLabel} from "@/core/document/tcEntries.js";

import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
const marker=(id:string,kind:"begin"|"end"):EditorTextRun=>({id,kind:"fieldChar",text:"",fieldChar:{kind},styles:{hidden:true}});
const instruction=(id:string,fieldInstruction:string):EditorTextRun=>({id,kind:"fieldInstruction",text:"",fieldInstruction,styles:{hidden:true}});
const fixture=()=>{
  const p=createEditorParagraph("Body");
  p.runs.push(marker("tc-b","begin"),instruction("tc-i",' TC "Fundamentação" \\f A \\l 2 '),marker("tc-e","end"),
    {id:"tail",kind:"text",text:" text"},
    marker("tc2-b","begin"),instruction("tc2-i",' TC "Conclusão" \\n '),marker("tc2-e","end"));
  const document=createEditorDocument([p]);
  const section=getDocumentSections(document)[0]!;
  document.sections=[{...section,pageNumbering:{start:12,format:"upperRoman"}}];
  return {p,document};
};
describe("F4A1 TC instruction and occurrence inventory",()=>{
  it("parses text, identifier, level and suppressed page label",()=>{
    expect(parseTcInstruction(' TC "Introdução" \\f A \\l 3 \\n ')).toEqual(
      {text:"Introdução",identifier:"A",level:3,omitPageNumber:true});
    expect(parseTcInstruction('TC "Título"')).toEqual({text:"Título",level:1,omitPageNumber:false});
    expect(parseTcInstruction('tc "A \\"quoted\\" title" \\L "9"')?.text).toBe('A "quoted" title');
  });
  it("refuses unknown and duplicate switches, invalid levels and identifiers",()=>{
    for(const raw of ['TC "A" \\l 0','TC "A" \\l 10','TC "A" \\f AA','TC "A" \\n \\n',
      'TC "A" \\x','TC ""','TC unquoted','TC "A" \\l','TC "A" \\n 3','TOC "A"'])
      expect(parseTcInstruction(raw),raw).toBeUndefined();
  });
  it("collects multiple entries in the same paragraph at their distinct source offsets",()=>{
    const {p,document}=fixture();
    const found=collectTcOccurrences(document)!;
    expect(found.map(e=>[e.text,e.offset,e.runId])).toEqual([
      ["Fundamentação",4,"tc-b"],["Conclusão",9,"tc2-b"]]);
    expect(found.every(e=>e.paragraphId===p.id)).toBe(true);
    const layout=projectDocumentLayout(document);
    expect(resolveTcPageLabel(document,layout,found[0]!)).toBe("XII");
    expect(resolveTcPageLabel(document,layout,found[1]!)).toBe("");
  });
  it("preserves TC field instructions through DOCX round-trip",async()=>{
    const {document}=fixture();
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(document));
    expect(collectTcOccurrences(reopened)?.map(e=>[e.raw.trim(),e.text,e.level,e.identifier,e.omitPageNumber]))
      .toEqual(collectTcOccurrences(document)?.map(e=>[e.raw.trim(),e.text,e.level,e.identifier,e.omitPageNumber]));
  });
  it("refuses malformed TC rather than silently dropping an entry",()=>{
    const {p,document}=fixture();
    p.runs=p.runs.filter(r=>r.id!=="tc2-e");
    expect(collectTcOccurrences(document)).toBeUndefined();
  });
});

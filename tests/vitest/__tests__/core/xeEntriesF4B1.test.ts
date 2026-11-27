import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph} from "@/core/editorState.js";
import {getDocumentSections,type EditorTextRun} from "@/core/model.js";
import {collectXeOccurrences,parseXeInstruction,resolveXePointPage} from "@/core/document/xeEntries.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const marker=(id:string,raw:string):EditorTextRun[]=>[
  {id:id+"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"},styles:{hidden:true}},
  {id:id+"i",kind:"fieldInstruction",text:"",fieldInstruction:raw,styles:{hidden:true}},
  {id:id+"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"},styles:{hidden:true}},
];
function fixture(){
  const p=createEditorParagraph("Texto");
  p.runs.push(...marker("a",' XE "Contratos:Licitação" \\f A \\b \\i '),
    {id:"more",kind:"text",text:" jurídico"},...marker("b",' XE "Concurso" \\t "Ver Servidor" '),
    ...marker("c",' XE "Processo" \\r Capitulo1 '));
  const document=createEditorDocument([p]);
  const section=getDocumentSections(document)[0]!;
  document.sections=[{...section,pageNumbering:{start:12,format:"upperRoman"}}];
  return {document,p};
}
describe("F4B1 XE grammar and source inventory",()=>{
  it("retains subentry path, entry type and page formatting without interpreting it",()=>{
    expect(parseXeInstruction(' XE "Contratos:Licitação" \\f a \\B \\i ')).toEqual({
      path:["Contratos","Licitação"],identifier:"a",boldPage:true,italicPage:true,reference:{kind:"page"},
    });
    expect(parseXeInstruction('XE "Processo" \\r Capitulo1')?.reference).toEqual({kind:"bookmarkRange",bookmark:"Capitulo1"});
    expect(parseXeInstruction('XE "Concurso" \\t "Ver Servidor"')?.reference).toEqual({kind:"crossReference",text:"Ver Servidor"});
    expect(parseXeInstruction('XE "A \\"quoted\\" name"')?.path).toEqual(['A "quoted" name']);
  });
  it("rejects unsupported, conflicting or malformed instructions",()=>{
    for(const raw of ['XE ""','XE "A::B"','XE "A:"','XE A','XE "A" \\b \\b','XE "A" \\f AA',
      'XE "A" \\r Missing \\t "See B"','XE "A" \\r "bad bookmark"','XE "A" \\t B','XE "A" \\t "B" \\i',
      'XE "A" \\x','XE "A','XE "A\\:B"','IF "XE" = "XE" "x" "y"'])
      expect(parseXeInstruction(raw),raw).toBeUndefined();
  });
  it("indexes each marker's source offset and resolves only point pages",()=>{
    const {document,p}=fixture(),before=JSON.stringify(document);
    const entries=collectXeOccurrences(document)!;
    expect(entries.map(e=>[e.runId,e.offset,e.paragraphId])).toEqual([
      ["ab",5,p.id],["bb",14,p.id],["cb",14,p.id],
    ]);
    const layout=projectDocumentLayout(document);
    expect(resolveXePointPage(document,layout,entries[0]!)).toEqual({physicalPageIndex:0,label:"XII"});
    expect(resolveXePointPage(document,layout,entries[1]!)).toBeUndefined();
    expect(resolveXePointPage(document,layout,entries[2]!)).toBeUndefined();
    expect(JSON.stringify(document)).toBe(before);
  });
  it("preserves original XE instructions and semantics through DOCX round-trip",async()=>{
    const {document}=fixture();
    const opened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(document));
    const projection=(d:typeof document)=>collectXeOccurrences(d)?.map(e=>
      [e.raw.trim(),e.path,e.identifier,e.reference,e.boldPage,e.italicPage,e.offset]);
    expect(projection(opened)).toEqual(projection(document));
  });
  it("fails closed when a malformed marker would otherwise disappear from an index",()=>{
    const {document,p}=fixture();
    p.runs.push(...marker("bad",' XE "Unclosed '));
    expect(collectXeOccurrences(document)).toBeUndefined();
  });
  it("does not invent a label for an unsupported numbering format",()=>{
    const {document}=fixture();
    const section=getDocumentSections(document)[0]!;
    document.sections=[{...section,pageNumbering:{format:"none"}}];
    const entry=collectXeOccurrences(document)![0]!;
    expect(resolveXePointPage(document,projectDocumentLayout(document),entry)).toBeUndefined();
  });
});

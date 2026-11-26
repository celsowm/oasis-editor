import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph} from "@/core/editorState.js";
import {getDocumentSections,type EditorTextRun} from "@/core/model.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {parseIndexInstruction,buildIndexPlan} from "@/core/document/indexPlan.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const marker=(id:string,raw:string):EditorTextRun[]=>[
  {id:id+"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"},styles:{hidden:true}},
  {id:id+"i",kind:"fieldInstruction",text:"",fieldInstruction:raw,styles:{hidden:true}},
  {id:id+"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"},styles:{hidden:true}},
];
function fixture(...fields:string[]){
  const p=createEditorParagraph("Texto do documento");
  fields.forEach((field,i)=>p.runs.push(...marker("m"+i,field)));
  const doc=createEditorDocument([p]);
  const section=getDocumentSections(doc)[0]!;
  doc.sections=[{...section,pageNumbering:{start:12,format:"upperRoman"}}];
  return doc;
}
const raw=' INDEX \\z "1046" ';
const plan=(doc:ReturnType<typeof fixture>,instruction=raw,locale?:string)=>
  buildIndexPlan(doc,projectDocumentLayout(doc),instruction,locale);

describe("F4B2 INDEX read-only entry plan",()=>{
  it("parses explicit Word LCID, identifier and separators",()=>{
    expect(parseIndexInstruction('INDEX \\z "1046" \\f A \\e "; " \\l " / " \\k ": " \\c 1')).toEqual({
      locale:"pt-BR",identifier:"A",entrySeparator:"; ",pageSeparator:" / ",crossReferenceSeparator:": ",
    });
    for(const field of ['INDEX \\f','INDEX \\f AB','INDEX \\z 9999','INDEX \\c 2','INDEX \\r',
      'INDEX \\h "A"','INDEX \\b Bookmark','INDEX \\e "," \\e "."','INDEX \\l "1234567890123456"'])
      expect(parseIndexInstruction(field),field).toBeUndefined();
  });
  it("sorts a hierarchy, creates parents, deduplicates physical pages and retains emphasis",async()=>{
    const doc=fixture('XE "Zebra"','XE "Contratos:Licitação" \\b','XE "Água"',
      'XE "Contratos:Licitação" \\b','XE "Contratos:Adesão"','XE "Concurso" \\t "Ver Servidor"',
      'XE "Ausente" \\f A');
    const before=JSON.stringify(doc),result=plan(doc)!;
    expect(result.locale).toBe("pt-BR");
    expect(result.entries.map(e=>e.path.join(":"))).toEqual(["Água","Concurso","Contratos","Contratos:Adesão","Contratos:Licitação","Zebra"]);
    expect(result.entries[2]!.pages).toEqual([]);
    expect(result.entries[4]!.pages).toEqual([{physicalPageIndex:0,label:"XII",bold:true,italic:false}]);
    expect(result.entries[1]!.crossReferences).toEqual(["Ver Servidor"]);
    expect(JSON.stringify(doc)).toBe(before);
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(doc));
    expect(plan(reopened)).toEqual(result);
  });
  it("uses Word default selection and requires an explicit locale",()=>{
    const doc=fixture('XE "Default"','XE "Typed" \\f A','XE "Explicit I" \\f I');
    expect(plan(doc)?.entries.map(e=>e.path)).toEqual([["Default"]]);
    expect(plan(doc,'INDEX \\f A \\z 1046')?.entries.map(e=>e.path)).toEqual([["Typed"]]);
    expect(plan(doc,"INDEX")).toBeUndefined();
    expect(plan(doc,"INDEX","pt-BR")?.locale).toBe("pt-BR");
  });
  it("preserves unsupported or ambiguous sources instead of approximating",()=>{
    for(const fields of [
      ['XE "A" \\r Range'],['XE "A;Sort"'],['XE "A"','XE "a"'],
      ['XE "A"','XE "A" \\b'],['XE "A"','XE "A" \\t "Ver B"'],
      ['XE "A" \\t "Ver B"','XE "A" \\t "Ver C"'],
    ])expect(plan(fixture(...fields)),fields.join(" | ")).toBeUndefined();
    expect(plan(fixture('XE "A" \\f a'),'INDEX \\f A \\z 1046')).toBeUndefined();
  });
});

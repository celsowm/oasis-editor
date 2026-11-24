import JSZip from "jszip";
import {describe,expect,it} from "vitest";
import {readDocumentVariables,resolveDocumentVariable,serializeDocumentVariables} from "@/ooxml/word/documentVariables.js";
import {evaluateFieldInstruction,compileFieldInstruction} from "@/core/document/fieldEvaluation.js";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {exportEditorDocumentToDocxPreservingSource} from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
const ns="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function variableField(id:string,raw:string,text="old"):EditorParagraphNode{
 return {id,type:"paragraph",runs:[
  {id:id+"b",text:"",kind:"fieldChar",fieldChar:{kind:"begin"}},
  {id:id+"i",text:"",kind:"fieldInstruction",fieldInstruction:raw},
  {id:id+"s",text:"",kind:"fieldChar",fieldChar:{kind:"separate"}},
  {id:id+"r",text,kind:"text"},
  {id:id+"e",text:"",kind:"fieldChar",fieldChar:{kind:"end"}},
 ]};
}
describe("F2A DOCVARIABLE snapshot",()=>{
 it("parses entities and rejects ambiguous case-insensitive names",()=>{
  const xml='<w:settings xmlns:w="'+ns+'"><w:docVars>'+
   '<w:docVar w:name="Case" w:val="PGE &amp; RJ"/>'+
   '<w:docVar w:name="Dup" w:val="first"/>'+
   '<w:docVar w:name="dup" w:val="second"/>'+
   '<w:docVar w:name="Blank" w:val=""/>'+
   '</w:docVars></w:settings>';
  const parsed=readDocumentVariables(xml);
  expect(parsed).toEqual({Case:"PGE & RJ",Blank:""});
  expect(resolveDocumentVariable(parsed,"cAsE")).toBe("PGE & RJ");
  expect(resolveDocumentVariable(parsed,"Dup")).toBeUndefined();
  expect(resolveDocumentVariable(parsed,"Blank")).toBe("");
  expect(readDocumentVariables(xml.replace("<w:settings","<!DOCTYPE foo><w:settings"))).toBeUndefined();
  expect(readDocumentVariables('<w:settings xmlns:w="'+ns+'"><w:docVars/>')).toBeUndefined();
 });
 it("validates field grammar and preserves missing or ambiguous cached results",()=>{
  expect(evaluateFieldInstruction('DOCVARIABLE "Case Name"',{documentVariables:{"Case Name":"Yes"}},"old"))
   .toMatchObject({status:"resolved",text:"Yes",dependencies:[{kind:"document-variable",name:"case name"}]});
  expect(evaluateFieldInstruction("DOCVARIABLE Missing",{documentVariables:{Case:"Yes"}},"old"))
   .toMatchObject({status:"preserved",reason:"unresolved",text:"old"});
  for(const raw of ['DOCVARIABLE','DOCVARIABLE Case \\* MERGEFORMAT','DOCVARIABLE Case extra']){
    expect(compileFieldInstruction(raw)).toBeUndefined();
  }
  expect(resolveDocumentVariable({Case:"1",case:"2"},"Case")).toBeUndefined();
 });
 it("imports and updates body scalar caches without mutating document variables",async()=>{
  const doc=createEditorDocument([variableField("v",'DOCVARIABLE "Case Name"')]);
  doc.documentVariables={"Case Name":"Processo 123",Blank:""};
  const bytes=await exportEditorDocumentToDocx(doc);
  const zip=await JSZip.loadAsync(bytes);
  expect(await zip.file("word/settings.xml")?.async("string")).toContain('w:name="Case Name" w:val="Processo 123"');
  const imported=await importDocxToEditorDocument(bytes);
  expect(imported.documentVariables).toEqual({"Case Name":"Processo 123",Blank:""});
  const original=JSON.stringify(imported);
  const refreshed=refreshBodyFieldCaches(createEditorStateFromDocument(imported));
  expect(refreshed.status).toBe("updated");
  const p=getDocumentSections(refreshed.state.document)[0]!.blocks[0] as EditorParagraphNode;
  expect(p.runs.map(r=>r.text).join("")).toBe("Processo 123");
  expect(JSON.stringify(imported)).toBe(original);
  expect(refreshBodyFieldCaches(refreshed.state).status).toBe("unchanged");
 });
 it("preserves variables during source-backed DOCX round-trip",async()=>{
  const doc=createEditorDocument([variableField("v","DOCVARIABLE Case")]);
  doc.documentVariables={Case:"North & South"};
  const bytes=await exportEditorDocumentToDocx(doc);
  const imported=await importDocxToEditorDocument(bytes);
  const out=await exportEditorDocumentToDocxPreservingSource(imported);
  expect((await importDocxToEditorDocument(out)).documentVariables).toEqual({Case:"North & South"});
 });
 it("escapes XML safely and refuses duplicate names or control characters",()=>{
  expect(serializeDocumentVariables({Case:'A & "B"'})).toContain('w:val="A &amp; &quot;B&quot;"');
  expect(serializeDocumentVariables({Case:"a",case:"b"})).toBe("");
  expect(serializeDocumentVariables({Case:"line\u0001break"})).toBe("");
 });
});

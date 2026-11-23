import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {compileFieldInstruction} from "@/core/document/fieldEvaluation.js";
import {resolveBodySequences,sequenceOccurrenceKey} from "@/core/document/sequenceFields.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

function seq(id:string,instruction:string,text="99",locked=false):EditorParagraphNode{
  return {id,type:"paragraph",runs:[
    {id:id+":b",kind:"fieldChar",text:"",fieldChar:{kind:"begin",fieldLock:locked}},
    {id:id+":i",kind:"fieldInstruction",text:"",fieldInstruction:instruction},
    {id:id+":s",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
    {id:id+":r",kind:"text",text},
    {id:id+":e",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
  ]};
}
const text=(p:EditorParagraphNode)=>p.runs.map(r=>r.text).join("");
describe("SEQ field evaluation",()=>{
  it("handles independent case-insensitive sequences, repeat, reset and number formats",()=>{
    const ps=[seq("a","SEQ Figure"),seq("b","SEQ table"),seq("c","SEQ figure \\n"),
      seq("d","SEQ Figure \\c"),seq("e","SEQ Figure \\r 8 \\* ROMAN"),seq("f","SEQ FIGURE"),seq("g","SEQ table")];
    const state=createEditorStateFromDocument(createEditorDocument(ps));
    const result=refreshBodyFieldCaches(state);
    expect(result.status).toBe("updated");
    expect((getDocumentSections(result.state.document)[0]!.blocks as EditorParagraphNode[]).map(text)).toEqual(["1","1","2","2","VIII","9","2"]);
    expect(refreshBodyFieldCaches(result.state).status).toBe("unchanged");
  });
  it("counts prior occurrences outside the selection and preserves other caches",()=>{
    const a=seq("a","SEQ Figure"),b=seq("b","SEQ Figure");
    const state=createEditorStateFromDocument(createEditorDocument([a,b]));
    const pos={paragraphId:"b",runId:"b:r",offset:1};
    const result=refreshBodyFieldCaches({...state,selection:{anchor:pos,focus:pos}},undefined,"selection");
    expect((getDocumentSections(result.state.document)[0]!.blocks as EditorParagraphNode[]).map(text)).toEqual(["99","2"]);
  });
  it("restarts after heading levels without resetting on lower-level headings",()=>{
    const heading=(id:string,outlineLevel:number):EditorParagraphNode=>({id,type:"paragraph",style:{outlineLevel},runs:[{id:id+":t",kind:"text",text:"Heading"}]});
    const ps=[heading("h1",0),seq("a","SEQ Figure \\s 1"),heading("h2",1),seq("b","SEQ Figure \\s 1"),heading("h3",0),seq("c","SEQ Figure \\s 1")];
    const values=resolveBodySequences(createEditorDocument(ps));
    expect(["a","b","c"].map(id=>values.get(sequenceOccurrenceKey(id,3)))).toEqual([1,2,1]);
  });
  it("does not guess unsupported or mismatched locked counters; a reset recovers",()=>{
    const ps=[seq("a","SEQ Figure","7",true),seq("b","SEQ Figure"),seq("t","SEQ Table"),seq("c","SEQ Figure \\r 9"),seq("d","SEQ Figure"),seq("e","SEQ Figure \\h"),seq("f","SEQ Figure")];
    const values=resolveBodySequences(createEditorDocument(ps));
    expect(["a","b","t","c","d","e","f"].map(id=>values.get(sequenceOccurrenceKey(id,3)))).toEqual([undefined,undefined,1,9,10,undefined,undefined]);
    for(const invalid of ["SEQ Figure \\r 0","SEQ Figure \\c \\n","SEQ Figure \\s 10","SEQ Figure \\r 2 \\r 3","SEQ Figure bookmark","SEQ Figure \\* Unknown"]){
      expect(compileFieldInstruction(invalid)).toBeUndefined();
    }
  });
  it("keeps advanced caption results and locks through DOCX export",async()=>{
    const a={...seq("a","SEQ Figure \\r 12","12"),style:{styleId:"Caption"}};
    const b={...seq("b","SEQ Figure","13",true),style:{styleId:"Caption"}};
    const doc=createEditorDocument([a,b]);
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(doc));
    expect((getDocumentSections(reopened)[0]!.blocks as EditorParagraphNode[]).map(text)).toEqual(["12","13"]);
  });
});

it("enumerates table-cell SEQ fields in body order and rejects cross-cell markers",()=>{
  const first=seq("a","SEQ Figure","1");
  const second=seq("b","SEQ Figure","2");
  const table={id:"tbl",type:"table" as const,rows:[{id:"row",cells:[
    {id:"c1",blocks:[first]},{id:"c2",blocks:[second]},
  ]}]};
  const doc=createEditorDocument([table,seq("after","SEQ Figure")]);
  const values=resolveBodySequences(doc);
  expect(["a","b","after"].map(id=>values.get(sequenceOccurrenceKey(id,3)))).toEqual([1,2,3]);
});

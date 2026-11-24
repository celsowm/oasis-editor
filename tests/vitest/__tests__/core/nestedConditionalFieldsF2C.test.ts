import JSZip from "jszip";
import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode,type EditorTextRun} from "@/core/model.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";
import {indexFieldStory} from "@/layoutProjection/fieldResultProjection.js";
import {evaluateField} from "@/core/document/fieldEvaluation.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

type Inner={instruction:string;cache?:string;locked?:boolean};
function nestedIf(id:string,left:string|Inner,operator:string,right:string|Inner,
  whenTrue:string,whenFalse:string,cache="old",outerLocked=false):EditorParagraphNode{
  const runs:EditorTextRun[]=[];
  const begin=(flag=false)=>runs.push({id:id+"r"+runs.length,kind:"fieldChar",text:"",fieldChar:{kind:"begin",...(flag?{fieldLock:true}:{})}});
  const instr=(raw:string)=>runs.push({id:id+"r"+runs.length,kind:"fieldInstruction",text:"",fieldInstruction:raw});
  const marker=(kind:"separate"|"end")=>runs.push({id:id+"r"+runs.length,kind:"fieldChar",text:"",fieldChar:{kind}});
  const value=(v:string)=>runs.push({id:id+"r"+runs.length,kind:"text",text:v});
  const operand=(arg:string|Inner)=>{
    if(typeof arg==="string"){instr(arg);return;}
    begin(arg.locked);
    instr(arg.instruction);
    marker("separate");
    value(arg.cache??"stale");
    marker("end");
  };
  begin(outerLocked);
  instr(" IF ");
  operand(left);
  instr(" "+operator+" ");
  operand(right);
  instr(' "'+whenTrue+'" "'+whenFalse+'" ');
  marker("separate");
  value(cache);
  marker("end");
  return {id,type:"paragraph",runs};
}
const caches=(p:EditorParagraphNode)=>p.runs.filter(r=>r.kind==="text").map(r=>r.text);
function document(p:EditorParagraphNode){
  const doc=createEditorDocument([p]);
  doc.documentVariables={Status:"A",Limit:"10",Key:"14"};
  doc.documentProperties={core:{Title:"Parecer"},custom:{Amount:"12",Approval:"A"}};
  return doc;
}
describe("F2C — bounded nested IF",()=>{
  it("qualifies one nested variable on the left and leaves its stale child result untouched",()=>{
    const p=nestedIf("a",{instruction:"DOCVARIABLE Status",cache:"WRONG"},"=",'"A"',"APROVADO","NEGADO");
    const doc=document(p);
    const candidates=new Map();
    indexFieldStory(getDocumentSections(doc)[0]!.blocks,candidates);
    expect(candidates.get("a")).toHaveLength(1);
    const field=candidates.get("a")[0].field;
    expect(field.type).toBe("IF_NESTED");
    expect(evaluateField(field,{documentVariables:doc.documentVariables,documentProperties:doc.documentProperties},"old"))
      .toMatchObject({status:"resolved",text:"APROVADO",dependencies:[
        {kind:"literal-condition"},{kind:"document-variable",name:"status"},
      ]});
    const first=refreshBodyFieldCaches(createEditorStateFromDocument(doc));
    expect(first.status).toBe("updated");
    const output=getDocumentSections(first.state.document)[0]!.blocks[0] as EditorParagraphNode;
    expect(caches(output)).toEqual(["WRONG","APROVADO"]);
    expect(refreshBodyFieldCaches(first.state).status).toBe("unchanged");
    const modified={...first.state,document:{...first.state.document,documentVariables:{Status:"B"}}};
    const second=refreshBodyFieldCaches(modified);
    expect(second.status).toBe("updated");
    expect(caches(getDocumentSections(second.state.document)[0]!.blocks[0] as EditorParagraphNode))
      .toEqual(["WRONG","NEGADO"]);
  });
  it("qualifies a right-hand property and a two-property numeric comparison",()=>{
    const right=nestedIf("r",'"A"',"=",{instruction:"DOCPROPERTY Approval"},"YES","NO");
    const double=nestedIf("n",{instruction:"DOCPROPERTY Amount"},">",{instruction:"DOCVARIABLE Limit"},"HIGH","LOW");
    const doc=createEditorDocument([right,double]);
    doc.documentProperties={custom:{Approval:"A",Amount:"12"}};
    doc.documentVariables={Limit:"10"};
    const res=refreshBodyFieldCaches(createEditorStateFromDocument(doc));
    expect(res.status).toBe("updated");
    const ps=getDocumentSections(res.state.document)[0]!.blocks as EditorParagraphNode[];
    expect(ps.map(x=>caches(x).at(-1))).toEqual(["YES","HIGH"]);
    expect(ps.map(x=>caches(x).slice(0,-1))).toEqual([["stale"],["stale","stale"]]);
  });
  it("preserves unresolved, locked, unsupported and unsafe conditions",()=>{
    const base=nestedIf("a",{instruction:"DOCVARIABLE Status"},"=",'"A"',"YES","NO");
    const locked=nestedIf("b",{instruction:"DOCVARIABLE Status",locked:true},"=",'"A"',"YES","NO");
    const unsupported=nestedIf("c",{instruction:"REF Something"},"=",'"A"',"YES","NO");
    const nonnumeric=nestedIf("d",{instruction:"DOCVARIABLE Status"},">",'"B"',"YES","NO");
    const missing=nestedIf("e",{instruction:"DOCVARIABLE Missing"},"=",'"A"',"YES","NO");
    const outerLocked=nestedIf("f",{instruction:"DOCVARIABLE Status"},"=",'"A"',"YES","NO","old",true);
    for(const p of [locked,unsupported,nonnumeric,missing,outerLocked]){
      const state=createEditorStateFromDocument(document(p));
      const res=refreshBodyFieldCaches(state);
      expect(res.status).toBe("unchanged");
      expect(caches(getDocumentSections(res.state.document)[0]!.blocks[0] as EditorParagraphNode).at(-1)).toBe("old");
    }
    const noOperand=nestedIf("g",{instruction:"DOCVARIABLE Status"},"=",'"A"',"YES","NO");
    // Appending another free-standing child field inside the parent code
    // breaks the exact five-argument contract.
    noOperand.runs.splice(-3,0,...nestedIf("z",{instruction:"DOCVARIABLE Status"},"=",'"A"',"Y","N").runs);
    const indexed=new Map();
    indexFieldStory([noOperand],indexed);
    expect(indexed.size).toBe(0);
    expect(caches(base).at(-1)).toBe("old");
  });
  it("preserves nested markers and original instructions through DOCX export/import",async()=>{
    const p=nestedIf("rt",{instruction:"DOCPROPERTY Title",cache:"STALE"},"=",'"Parecer"',"SIM","NÃO");
    const doc=document(p);
    const updated=refreshBodyFieldCaches(createEditorStateFromDocument(doc));
    expect(updated.status).toBe("updated");
    const buffer=await exportEditorDocumentToDocx(updated.state.document);
    const zip=await JSZip.loadAsync(buffer);
    const xml=await zip.file("word/document.xml")?.async("string")??"";
    expect(xml).toContain("DOCPROPERTY Title");
    expect(xml).toContain(" IF ");
    const reopened=await importDocxToEditorDocument(buffer);
    const paragraphs=getDocumentSections(reopened)[0]!.blocks as EditorParagraphNode[];
    expect(caches(paragraphs[0]!)).toEqual(["STALE","SIM"]);
    expect(refreshBodyFieldCaches(createEditorStateFromDocument(reopened)).status).toBe("unchanged");
  });
});

import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {compileFieldInstruction,evaluateFieldInstruction} from "@/core/document/fieldEvaluation.js";
import {createStyleRefIndex} from "@/core/document/styleReference.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const heading=(id:string,title:string,styleId="heading1"):EditorParagraphNode=>({
  id,type:"paragraph",style:{styleId},runs:[{id:id+":text",kind:"text",text:title}],
});
const ref=(id:string,raw:string,result="xxxxx",locked=false):EditorParagraphNode=>({
  id,type:"paragraph",runs:[
    {id:id+":begin",kind:"fieldChar",text:"",fieldChar:{kind:"begin",fieldLock:locked}},
    {id:id+":code",kind:"fieldInstruction",text:"",fieldInstruction:raw},
    {id:id+":sep",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
    {id:id+":result",kind:"text",text:result},
    {id:id+":end",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
  ],
});
describe("STYLEREF qualified evaluation",()=>{
  it("parses quoted custom and built-in Heading styles without ignoring unsupported switches",()=>{
    expect(compileFieldInstruction(' STYLEREF "Heading 1" ')).toEqual({type:"STYLEREF",style:"Heading 1",lastOnPage:false});
    expect(compileFieldInstruction("STYLEREF 1 \\l")).toEqual({type:"STYLEREF",style:"1",lastOnPage:true});
    expect(compileFieldInstruction('STYLEREF "Heading 1" \n')).toEqual({type:"STYLEREF",style:"Heading 1",lastOnPage:false,output:"number"});
    expect(compileFieldInstruction('STYLEREF "Heading 1" \p')).toEqual({type:"STYLEREF",style:"Heading 1",lastOnPage:false,output:"position"});
    for(const raw of ["STYLEREF","STYLEREF \\l",'STYLEREF "Heading 1" \\t',
      'STYLEREF "Heading 1" \\n \\p','STYLEREF "Heading 1" \\l \\l']){
      expect(compileFieldInstruction(raw)).toBeUndefined();
    }
    expect(evaluateFieldInstruction('STYLEREF "Heading 1"',{},"cache")).toMatchObject({status:"preserved",text:"cache"});
  });
  it("resolves closest preceding styled paragraph for body fields, then updates caches with F9",async()=>{
    const doc=createEditorDocument([
      heading("first","Alpha"),ref("one",'STYLEREF "Heading 1"',"old"),
      heading("second","Bravo"),ref("two",'STYLEREF "Heading 1"',"old"),
      ref("locked",'STYLEREF "Heading 1"',"old",true),
    ]);
    const snapshot=JSON.stringify(doc);
    const layout=projectDocumentLayout(doc);
    const index=createStyleRefIndex(doc,layout);
    expect(index.forBody("one","Heading 1")).toBe("Alpha");
    expect(index.forBody("two","1")).toBe("Bravo");
    const state=createEditorStateFromDocument(doc);
    const result=refreshBodyFieldCaches(state);
    expect(result.status).toBe("updated");
    const ps=getDocumentSections(result.state.document)[0]!.blocks as EditorParagraphNode[];
    expect(ps.map(p=>p.runs.map(r=>r.text).join(""))).toEqual(["Alpha","Alpha","Bravo","Bravo","old"]);
    expect(refreshBodyFieldCaches(result.state).status).toBe("unchanged");
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document));
    expect((getDocumentSections(reopened)[0]!.blocks[1] as EditorParagraphNode).runs.map(r=>r.text).join("")).toBe("Alpha");
    expect(JSON.stringify(doc)).toBe(snapshot);
  });
  it("projects the first or last on-page heading into repeated headers without mutating source",()=>{
    const base=createEditorDocument([heading("a","Alpha"),heading("b","Bravo")]);
    const first=getDocumentSections(base)[0]!;
    const header=ref("head",'STYLEREF "Heading 1"',"xxxxx");
    const last=ref("tail",'STYLEREF "Heading 1" \\l',"yyyyy");
    const doc={...base,sections:[{...first,header:[header,last]}]};
    const layout=projectDocumentLayout(doc);
    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0]!.headerBlocks?.map(b=>b.layout?.text)).toEqual(["Alpha","Bravo"]);
    expect(doc.sections[0]!.header![0]).toBe(header);
  });
  it("retains source cache when duplicate styles, unsafe runs, or missing prior heading make the reference ambiguous",()=>{
    const first=ref("first",'STYLEREF "Chapter"',"cache");
    const h=heading("h","Hello","custom-a");
    const second=ref("second",'STYLEREF "Chapter"',"cache");
    const doc=createEditorDocument([first,h,second]);
    doc.styles={
      "custom-a":{id:"custom-a",name:"Chapter",type:"paragraph"},
      "custom-b":{id:"custom-b",name:"Chapter",type:"paragraph"},
    };
    const layout=projectDocumentLayout(doc);
    const idx=createStyleRefIndex(doc,layout);
    expect(idx.forBody("second","Chapter")).toBeUndefined();
    expect(idx.forBody("first","Chapter")).toBeUndefined();
    expect(refreshBodyFieldCaches(createEditorStateFromDocument(doc)).status).toBe("unchanged");
    const invalid=heading("bad","hidden");
    invalid.runs[0]!.styles={hidden:true};
    const check=createEditorDocument([invalid,ref("r",'STYLEREF "Heading 1"',"cache")]);
    expect(createStyleRefIndex(check,projectDocumentLayout(check)).forBody("r","Heading 1")).toBeUndefined();
  });
});

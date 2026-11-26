import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorParagraphNode,type EditorState,type EditorTextRun} from "@/core/model.js";
import {findQualifiedIndexRegion,refreshIndexConvergently} from "@/core/document/indexRefresh.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
const ctrl=(id:string,kind:"begin"|"separate"|"end"):EditorTextRun=>({id,kind:"fieldChar",text:"",fieldChar:{kind}});
const instr=(id:string,raw:string):EditorTextRun=>({id,kind:"fieldInstruction",text:"",fieldInstruction:raw});
function fixture(raw=' INDEX \\z "1046" '){
  const intro=createEditorParagraph("Índice");
  const begin=createEditorParagraph("");begin.runs=[ctrl("ib","begin"),instr("ii",raw),ctrl("is","separate")];
  const stale=createEditorParagraph("Antigo, 99");
  const end=createEditorParagraph("");end.runs=[ctrl("ie","end")];
  const body=createEditorParagraph("Texto jurídico");
  const fields=[' XE "Zebra" ',' XE "Contratos:Licitação" \\b \\i ',' XE "Água" ',
    ' XE "Concurso" \\t "Ver Servidor" ',' XE "Contratos:Licitação" \\b \\i '];
  fields.forEach((f,i)=>body.runs.push(ctrl("b"+i,"begin"),instr("i"+i,f),ctrl("e"+i,"end")));
  const document=createEditorDocument([intro,begin,stale,end,body]);
  return {state:createEditorStateFromDocument(document),begin,stale,end,body};
}
function entries(s:EditorState):EditorParagraphNode[]{
  const blocks=getDocumentSections(s.document)[0]!.blocks,region=findQualifiedIndexRegion(blocks)!;
  return blocks.slice(region.start+1,region.end).filter(b=>b.type==="paragraph");
}
describe("F4B3A flat INDEX transactional regeneration",()=>{
  it("updates sorted hierarchy, cross references and page emphasis; preserves control runs and source",()=>{
    const {state,begin,end,body}=fixture(),before=JSON.stringify(state);
    const result=refreshIndexConvergently(state);
    expect(result.status).toBe("updated");
    const cache=entries(result.state);
    expect(cache.map(getParagraphText)).toEqual(["Água, 1","Concurso. Ver Servidor","Contratos","Licitação, 1","Zebra, 1"]);
    expect(cache[3]!.style?.indentLeft).toBe(24);
    expect(cache[3]!.runs.at(-1)).toMatchObject({text:"1",styles:{bold:true,italic:true}});
    const blocks=getDocumentSections(result.state.document)[0]!.blocks;
    for(const original of [begin,end,body])expect(blocks.find(b=>b.id===original.id)).toEqual(original);
    expect(result.state.selection).toBe(state.selection);
    expect(JSON.stringify(state)).toBe(before);
    expect(refreshIndexConvergently(result.state)).toMatchObject({state:result.state,status:"unchanged"});
  });
  it("retains visible index and emphasis through DOCX reimport",async()=>{
    const {state}=fixture(),result=refreshIndexConvergently(state);
    const opened=createEditorStateFromDocument(await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document)));
    expect(getDocumentSections(opened.document)[0]!.blocks.filter(b=>b.type==="paragraph").map(getParagraphText))
      .toContain("Licitação, 1");
    const paragraph=getDocumentSections(opened.document)[0]!.blocks.find(b=>b.type==="paragraph"&&getParagraphText(b)==="Licitação, 1");
    expect(paragraph?.type==="paragraph"&&paragraph.runs.at(-1)).toMatchObject({text:"1",styles:{bold:true,italic:true}});
  });
  it("does not publish an unverified candidate or mutate anchored cache entries",()=>{
    const {state,stale}=fixture();
    expect(refreshIndexConvergently(state,undefined,projectDocumentLayout,1)).toMatchObject({state,status:"nonconvergent"});
    const anchored={...state,document:{...state.document,bookmarks:{order:["a"],items:{a:{id:"a",name:"Cache",
      start:{paragraphId:stale.id,offset:0},end:{paragraphId:stale.id,offset:1}}}}}};
    expect(refreshIndexConvergently(anchored)).toMatchObject({state:anchored,status:"unsupported"});
    const locked=fixture(' INDEX \\c 2 \\z "1046" ').state;
    expect(refreshIndexConvergently(locked)).toMatchObject({state:locked,status:"unsupported"});
  });
  it("rolls back when a second pagination pass fails",()=>{
    const {state}=fixture();let passes=0;
    const result=refreshIndexConvergently(state,undefined,doc=>{
      if(++passes===2)throw Error("layout failed");
      return projectDocumentLayout(doc);
    });
    expect(result).toMatchObject({state,status:"unsupported",passes:2});
  });
});

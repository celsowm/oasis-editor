import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorTextRun} from "@/core/model.js";
import {hasNestedTocPageRefs,refreshNestedTocPageRefs} from "@/core/document/tocNestedPageRefs.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
import JSZip from "jszip";

const marker=(id:string,kind:"begin"|"separate"|"end"):EditorTextRun=>
  ({id,kind:"fieldChar",text:"",fieldChar:{kind}});
const code=(id:string,fieldInstruction:string):EditorTextRun=>
  ({id,kind:"fieldInstruction",text:"",fieldInstruction});
const text=(id:string,value:string,link?:string):EditorTextRun=>
  ({id,kind:"text",text:value,styles:{bold:true,...(link?{link}:{})}});
const fixture=()=>{
  const title=createEditorParagraph("Alpha");title.style={styleId:"heading1"};
  const entry=createEditorParagraph("");
  entry.style={styleId:"TOC1",indentLeft:12};
  entry.runs=[marker("outer-b","begin"),code("outer-i",' TOC \\o "1-3" \\h '),marker("outer-s","separate"),
    text("prefix-a","Al","#_TocAlpha"),text("prefix-b","pha\t","#_TocAlpha"),
    marker("inner-b","begin"),code("inner-i"," PAGEREF _TocAlpha \\h "),marker("inner-s","separate"),
    text("number","1","#_TocAlpha"),marker("inner-e","end"),marker("outer-e","end")];
  const doc=createEditorDocument([title,entry]);
  doc.styles={...doc.styles,TOC1:{id:"TOC1",name:"TOC 1",type:"paragraph"}};
  const section=getDocumentSections(doc)[0]!;
  doc.sections=[{...section,pageNumbering:{start:12,format:"upperRoman"}}];
  doc.bookmarks={order:["bm"],items:{bm:{id:"bm",name:"_TocAlpha",hidden:true,
    start:{paragraphId:title.id,offset:0},end:{paragraphId:title.id,offset:5}}}};
  return {state:createEditorStateFromDocument(doc),entry};
};
describe("F3H1 nested TOC PAGEREF cache",()=>{
  it("updates only the formatted page result, keeping all markers and source styles",async()=>{
    const {state,entry}=fixture();
    expect(hasNestedTocPageRefs(state)).toBe(true);
    const result=refreshNestedTocPageRefs(state);
    expect(result.status).toBe("updated");
    const p=getDocumentSections(result.state.document)[0]!.blocks[1]!;
    expect(p).toEqual({...entry,runs:entry.runs.map(r=>r.id==="number"?{...r,text:"XII"}:r)});
    expect(result.state.document.bookmarks).toBe(state.document.bookmarks);
    expect(result.state.selection).toBe(state.selection);
    expect(refreshNestedTocPageRefs(result.state).status).toBe("unchanged");
    const bytes=await exportEditorDocumentToDocx(result.state.document);
    const xml=await (await JSZip.loadAsync(bytes)).file("word/document.xml")!.async("string");
    expect(xml).toContain("PAGEREF _TocAlpha");
    expect(xml).toContain("XII");
    const imported=await importDocxToEditorDocument(bytes);
    expect(getDocumentSections(imported)[0]!.blocks.some(b=>b.type==="paragraph"&&b.runs.some(r=>r.text==="XII"))).toBe(true);
  });
  it("rolls back if bookmark is missing or candidate pagination fails",()=>{
    const {state}=fixture();
    const missing={...state,document:{...state.document,bookmarks:undefined}};
    expect(refreshNestedTocPageRefs(missing)).toMatchObject({state:missing,status:"unresolved"});
    let calls=0;
    expect(refreshNestedTocPageRefs(state,doc=>{
      if(++calls===2)throw Error("layout unavailable");
      return projectDocumentLayout(doc);
    })).toMatchObject({state,status:"unsupported"});
  });
  it("refuses locked child fields",()=>{
    const {state,entry}=fixture();
    const section=getDocumentSections(state.document)[0]!;
    const locked={...state,document:{...state.document,sections:[{...section,blocks:section.blocks.map(b=>b.id===entry.id?
      {...entry,runs:entry.runs.map(r=>r.id==="inner-b"&&r.kind==="fieldChar"?{...r,fieldChar:{...r.fieldChar,fieldLock:true}}:r)}:b)}]}};
    expect(hasNestedTocPageRefs(locked)).toBe(false);
    expect(refreshNestedTocPageRefs(locked)).toMatchObject({state:locked,status:"unsupported"});
  });
});


describe("F3H2 Word gallery content-control TOC",()=>{
  const gallery='<w:docPartObj xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docPartGallery w:val="Table of Contents"/><w:docPartUnique/></w:docPartObj>';
  const wrapped=(override:Partial<import("@/core/model.js").EditorSdtPr>={})=>{
    const {state,entry}=fixture();
    const wrapper={groupId:"sdt:toc",sdtPr:{id:"42",lock:"sdtLocked",unknownXml:gallery,...override}};
    const section=getDocumentSections(state.document)[0]!;
    const begin={...createEditorParagraph(""),runs:entry.runs.slice(0,3),sdtWrappers:[wrapper]};
    const middle={...entry,runs:entry.runs.slice(3,-1),sdtWrappers:[wrapper]};
    const end={...createEditorParagraph(""),runs:entry.runs.slice(-1),sdtWrappers:[wrapper]};
    const heading={...createEditorParagraph("Contents"),sdtWrappers:[wrapper]};
    return {state:{...state,document:{...state.document,sections:[{...section,blocks:[section.blocks[0]!,heading,begin,middle,end]}]}},
      middle,wrapper};
  };
  it("updates a multi-paragraph gallery TOC and preserves one enclosing SDT through DOCX",async()=>{
    const {state,middle,wrapper}=wrapped();
    const before=JSON.stringify(state);
    const updated=refreshNestedTocPageRefs(state);
    expect(updated.status).toBe("updated");
    const blocks=getDocumentSections(updated.state.document)[0]!.blocks;
    expect(blocks[3]).toEqual({...middle,runs:middle.runs.map(r=>r.id==="number"?{...r,text:"XII"}:r)});
    expect(blocks.slice(1).every(p=>p.sdtWrappers?.[0]===wrapper)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    const bytes=await exportEditorDocumentToDocx(updated.state.document);
    const xml=await (await JSZip.loadAsync(bytes)).file("word/document.xml")!.async("string");
    expect(xml.split("<w:sdt>").length-1).toBe(1);
    expect(xml).toContain("Table of Contents");
    expect(xml).toContain('w:lock w:val="sdtLocked"');
    const imported=await importDocxToEditorDocument(bytes);
    const children=getDocumentSections(imported)[0]!.blocks.filter(p=>p.sdtWrappers?.length);
    expect(children).toHaveLength(4);
    expect(new Set(children.map(p=>p.sdtWrappers![0]!.groupId)).size).toBe(1);
    expect(children.some(p=>p.type==="paragraph"&&p.runs.some(r=>r.text==="XII"))).toBe(true);
  });
  it("rejects content locks, data binding, placeholder, temporary and unknown gallery metadata",()=>{
    for(const override of [{lock:"contentLocked"},{lock:"sdtContentLocked"},{dataBinding:{xpath:"/root"}},
      {temporary:true},{showingPlcHdr:true},{unknownXml:gallery.replace("Table of Contents","Cover Pages")},
      {unknownXml:gallery+'<w:custom xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'}]){
      const {state}=wrapped(override);
      expect(hasNestedTocPageRefs(state)).toBe(false);
      expect(refreshNestedTocPageRefs(state)).toMatchObject({state,status:"unsupported"});
    }
  });
  it("rejects a field crossing two wrapper groups",()=>{
    const {state,middle,wrapper}=wrapped();
    const section=getDocumentSections(state.document)[0]!;
    const crossed={...state,document:{...state.document,sections:[{...section,blocks:section.blocks.map(p=>p.id===middle.id?
      {...middle,sdtWrappers:[{...wrapper,groupId:"sdt:other"}]}:p)}]}};
    expect(refreshNestedTocPageRefs(crossed)).toMatchObject({state:crossed,status:"unsupported"});
  });
});


describe("F3H3 fragmented nested PAGEREF results",()=>{
  const fragmented=(parts:string[],start:number)=>{
    const {state,entry}=fixture();
    const section=getDocumentSections(state.document)[0]!;
    const fragments=parts.map((part,i)=>({...text("number-"+i,part,"#_TocAlpha"),
      styles:{link:"#_TocAlpha",bold:i===0,italic:i>0}}));
    const paragraph={...entry,runs:entry.runs.flatMap(r=>r.id==="number"?fragments:[r])};
    return {state:{...state,document:{...state.document,sections:[{...section,
      pageNumbering:{start,format:"decimal" as const},blocks:[section.blocks[0]!,paragraph]}]}},paragraph,fragments};
  };
  for(const [parts,start,expected] of [
    [["1","2"],34,["3","4"]],
    [["1","2"],1234,["1","234"]],
    [["12","34"],567,["56","7"]],
    [["12","3","4"],567,["5","6","7"]],
  ] as [string[],number,string[]][]){
    it("retains run identities and styles: "+parts.join("|")+" → "+expected.join("|"),()=>{
      const {state,paragraph,fragments}=fragmented(parts,start);
      const before=JSON.stringify(state);
      expect(hasNestedTocPageRefs(state)).toBe(true);
      const result=refreshNestedTocPageRefs(state);
      expect(result.status).toBe("updated");
      expect(result.updatedEntries).toBe(1);
      const block=getDocumentSections(result.state.document)[0]!.blocks[1]!;
      const expectedRuns=paragraph.runs.map(r=>{
        const i=fragments.findIndex(f=>f.id===r.id);
        return i<0?r:{...r,text:expected[i]!};
      });
      expect(block).toEqual({...paragraph,runs:expectedRuns});
      expect(refreshNestedTocPageRefs(result.state)).toMatchObject({status:"unchanged",state:result.state});
      expect(JSON.stringify(state)).toBe(before);
    });
  }
  it("refuses destructive shrinkage, non-label fragments and foreign links",()=>{
    const short=fragmented(["1","2"],3).state;
    expect(refreshNestedTocPageRefs(short)).toMatchObject({state:short,status:"unsupported"});
    const invalid=fragmented(["1","?"],34).state;
    expect(hasNestedTocPageRefs(invalid)).toBe(false);
    const {state,paragraph}=fragmented(["1","2"],34);
    const section=getDocumentSections(state.document)[0]!;
    const foreign={...state,document:{...state.document,sections:[{...section,blocks:[
      section.blocks[0]!,{...paragraph,runs:paragraph.runs.map(r=>r.id==="number-1"?
        {...r,styles:{...r.styles,link:"#Other"}}:r)}]}]}};
    expect(refreshNestedTocPageRefs(foreign)).toMatchObject({state:foreign,status:"unsupported"});
  });
  it("does not change fragment lengths in an anchored paragraph",()=>{
    const {state,paragraph}=fragmented(["1","2"],123);
    const anchored={...state,selection:{anchor:{paragraphId:paragraph.id,runId:"number-1",offset:1},
      focus:{paragraphId:paragraph.id,runId:"number-1",offset:1}}};
    expect(refreshNestedTocPageRefs(anchored)).toMatchObject({state:anchored,status:"unsupported"});
  });
  it("retains separately formatted fragments through DOCX export and import",async()=>{
    const {state}=fragmented(["1","2"],34);
    const result=refreshNestedTocPageRefs(state);
    expect(result.status).toBe("updated");
    const imported=await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document));
    const block=getDocumentSections(imported)[0]!.blocks[1]!;
    expect(block.type).toBe("paragraph");
    if(block.type!=="paragraph")throw Error("missing TOC paragraph");
    const a=block.runs.find(r=>r.text==="3"),b=block.runs.find(r=>r.text==="4");
    expect(a?.styles?.bold).toBe(true);
    expect(b?.styles?.italic).toBe(true);
    expect(a?.styles?.link).toBe("#_TocAlpha");
    expect(b?.styles?.link).toBe("#_TocAlpha");
  });
});

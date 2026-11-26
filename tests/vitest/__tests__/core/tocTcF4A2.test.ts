import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,positionToParagraphOffset,type EditorTextRun,type EditorDocument,type EditorParagraphNode,type EditorState} from "@/core/model.js";
import {parseTocInstruction,findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {insertTableOfContents} from "@/core/commands/tableOfContents.js";
import {refreshLinkedTableOfContents} from "@/core/document/tocLinks.js";
import {resolveTocLinkNavigation} from "@/core/document/tocLinkNavigation.js";
import {refreshTableOfContentsConvergently} from "@/core/document/tocConvergence.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const tc=(id:string,raw:string):EditorTextRun[]=>[
  {id:id+"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"},styles:{hidden:true}},
  {id:id+"i",kind:"fieldInstruction",text:"",fieldInstruction:raw,styles:{hidden:true}},
  {id:id+"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"},styles:{hidden:true}},
];
function fixture(raw=' TOC \\f A \\l "2-3" '){
  const intro=createEditorParagraph("Sumário");
  const heading=createEditorParagraph("Not a TC entry");heading.style={styleId:"heading1"};
  const body=createEditorParagraph("Body");
  body.runs.push(...tc("a",' TC "Primeira" \\f a \\l 2 '),
    {id:"between-tc",kind:"text",text:" middle"},
    ...tc("b",' TC "Sem página" \\f A \\l 3 \\n '),
    ...tc("c",' TC "Other identifier" \\f B \\l 2 '),
    ...tc("d",' TC "Outside range" \\f A \\l 1 '));
  const inserted=insertTableOfContents(createEditorStateFromDocument(createEditorDocument([intro,heading,body])),()=>1);
  const section=getDocumentSections(inserted.document)[0]!;
  const blocks=section.blocks.map(b=>b.type==="paragraph"?{...b,runs:b.runs.map(r=>
    r.kind==="fieldInstruction"&&r.fieldInstruction.trim().startsWith("TOC")?{...r,fieldInstruction:raw}:r)}:b);
  const state={...inserted,document:{...inserted.document,sections:[{...section,blocks,pageNumbering:{start:12,format:"upperRoman"}}]}};
  return {state,body};
}
function entries(doc:EditorDocument){
  const blocks=getDocumentSections(doc)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).map(p=>getParagraphText(p as EditorParagraphNode));
}
describe("F4A2A TC-only flat TOC refresh",()=>{
  it("qualifies explicit TC-only grammar, refuses mixed and unsafe options",()=>{
    expect(parseTocInstruction('TOC \\f "A" \\l "2-3"')).toMatchObject({tcIdentifier:"A",startLevel:2,endLevel:3});
    expect(parseTocInstruction('TOC \\f A \\h')).toMatchObject({tcIdentifier:"A",hyperlinks:true});
    for(const raw of ['TOC \\f','TOC \\f AB','TOC \\f A \\o "1-3"','TOC \\l "2-3"','TOC \\f A \\l "3-2"'])
      expect(parseTocInstruction(raw),raw).toBeUndefined();
  });
  it("regenerates selected marker occurrences, suppresses pages and survives DOCX",async()=>{
    const {state}=fixture(),before=JSON.stringify(state);
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state.document)).toEqual(["Primeira\tXII","Sem página"]);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.state.selection).toEqual(state.selection);
    expect(refreshTableOfContentsConvergently(result.state).status).toBe("unchanged");
    const doc=await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document));
    expect(entries(doc)).toEqual(["Primeira\tXII","Sem página"]);
    expect(refreshTableOfContentsConvergently(createEditorStateFromDocument(doc)).status).toBe("unchanged");
  });
  it("rolls back when page geometry or marker grammar is unqualified",()=>{
    const {state,body}=fixture();
    const section=getDocumentSections(state.document)[0]!;
    const unsupported={...state,document:{...state.document,sections:[{...section,pageNumbering:{format:"none"}}]}};
    expect(refreshTableOfContentsConvergently(unsupported)).toMatchObject({status:"unresolved",state:unsupported});
    const malformed={...state,document:{...state.document,sections:[{...section,blocks:section.blocks.map(b=>
      b.id===body.id&&b.type==="paragraph"?{...b,runs:b.runs.map(r=>r.id==="ai"&&r.kind==="fieldInstruction"?{...r,fieldInstruction:'TC "Bad" \\l 0'}:r)}:b)}]}};
    expect(refreshTableOfContentsConvergently(malformed)).toMatchObject({status:"unsupported",state:malformed});
  });
});

describe("F4A2B offset-specific linked TC caches",()=>{
  function cache(doc:EditorDocument){
    const blocks=getDocumentSections(doc)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
    return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).filter(p=>p.type==="paragraph");
  }
  it("links distinct markers in one paragraph, including a suppressed page, and round-trips",async()=>{
    const {state}=fixture(' TOC \\f A \\l "2-3" \\h ');
    const original=JSON.stringify(state);
    const result=refreshLinkedTableOfContents(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state.document)).toEqual(["Primeira\tXII","Sem página"]);
    const check=(s:EditorState)=>{
      const links=cache(s.document).map(p=>p.runs[0]!.styles?.link);
      expect(new Set(links).size).toBe(2);
      for(const [i,p] of cache(s.document).entries()){
        const nav=resolveTocLinkNavigation(s,p.id,1);
        expect(nav?.document).toBe(s.document);
        const target=getDocumentSections(s.document)[0]!.blocks.find(b=>b.id===nav?.selection.focus.paragraphId);
        expect(target?.type).toBe("paragraph");
        expect(positionToParagraphOffset(target as EditorParagraphNode,nav!.selection.focus)).toBe([4,11][i]);
        const bookmark=Object.values(s.document.bookmarks!.items).find(b=>"#"+b.name===links[i]);
        expect(bookmark?.start?.offset).toBe([4,11][i]);
        expect(bookmark?.end?.offset).toBe(bookmark?.start?.offset);
      }
    };
    check(result.state);
    expect(JSON.stringify(state)).toBe(original);
    expect(refreshLinkedTableOfContents(result.state)).toMatchObject({status:"unchanged",state:result.state});
    const opened=createEditorStateFromDocument(await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document)));
    check(opened);
    expect(refreshLinkedTableOfContents(opened).status).toBe("unchanged");
  });
  it("refuses a misdirected TC link and repairs owned stale cache links transactionally",()=>{
    const {state}=fixture(' TOC \\f A \\l "2-3" \\h ');
    const linked=refreshLinkedTableOfContents(state).state;
    const first=cache(linked.document)[0]!,second=cache(linked.document)[1]!;
    const section=getDocumentSections(linked.document)[0]!;
    const misdirected={...linked,document:{...linked.document,sections:[{...section,blocks:section.blocks.map(b=>
      b.id===first.id?{...first,runs:[{...first.runs[0]!,styles:{...first.runs[0]!.styles,link:second.runs[0]!.styles?.link}}]}:b)}]}};
    expect(resolveTocLinkNavigation(misdirected,first.id,1)).toBeUndefined();
    const fixed=refreshLinkedTableOfContents(misdirected);
    expect(fixed.status).toBe("updated");
    const repaired=cache(fixed.state.document)[0]!;
    expect(repaired.runs[0]!.styles?.link).toBe(first.runs[0]!.styles?.link);
    expect(refreshLinkedTableOfContents(fixed.state).status).toBe("unchanged");
  });
});

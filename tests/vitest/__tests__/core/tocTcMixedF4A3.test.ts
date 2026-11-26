import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,getParagraphLength,positionToParagraphOffset,type EditorState,type EditorTextRun} from "@/core/model.js";
import {insertTableOfContents,collectQualifiedTocHeadings,updateTableOfContents} from "@/core/commands/tableOfContents.js";
import {parseTocInstruction,findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {refreshLinkedTableOfContents} from "@/core/document/tocLinks.js";
import {resolveTocLinkNavigation} from "@/core/document/tocLinkNavigation.js";
import {refreshTableOfContentsConvergently} from "@/core/document/tocConvergence.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

function marker(id:string,raw:string):EditorTextRun[]{
  return [
    {id:id+"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"},styles:{hidden:true}},
    {id:id+"i",kind:"fieldInstruction",text:"",fieldInstruction:raw,styles:{hidden:true}},
    {id:id+"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"},styles:{hidden:true}},
  ];
}
const raw=' TOC \\o "1-2" \\t "Legal,4" \\f A \\l "3-3" ';
function fixture(instruction=raw,overlap=false){
  const intro=createEditorParagraph("Intro");
  const first=createEditorParagraph("First");first.style={styleId:"heading1"};
  const mid=createEditorParagraph("Body");
  mid.runs.push(...marker("m",' TC "Marked" \\f A \\l 3 '),
    {id:"mid-text",kind:"text",text:" suffix"},...marker("n",' TC "No page" \\f A \\l 3 \\n '),
    ...marker("x",' TC "Excluded level" \\f A \\l 2 '),...marker("y",' TC "Excluded id" \\f B \\l 3 '));
  const custom=createEditorParagraph("Custom");custom.style={styleId:"legal"};
  const last=createEditorParagraph("Last");last.style={styleId:"heading2"};
  if(overlap)first.runs.push(...marker("overlap",' TC "Ambiguous" \\f A \\l 3 '));
  const doc=createEditorDocument([intro,first,mid,custom,last]);
  doc.styles={...doc.styles,legal:{id:"legal",name:"Legal",type:"paragraph",customStyle:true}};
  const inserted=insertTableOfContents(createEditorStateFromDocument(doc),()=>1);
  const section=getDocumentSections(inserted.document)[0]!;
  return {...inserted,document:{...inserted.document,sections:[{...section,blocks:section.blocks.map(b=>
    b.type==="paragraph"?{...b,runs:b.runs.map(r=>r.kind==="fieldInstruction"&&r.fieldInstruction.trim().startsWith("TOC")
      ?{...r,fieldInstruction:instruction}:r)}:b)}]}};
}
function entries(state:EditorState){
  const blocks=getDocumentSections(state.document)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).filter(b=>b.type==="paragraph").map(getParagraphText);
}
describe("F4A3A mixed flat TOC source qualification",()=>{
  it("keeps outline and TC ranges independent with or without hyperlinks",()=>{
    expect(parseTocInstruction(raw)).toMatchObject({startLevel:1,endLevel:2,tcIdentifier:"A",tcMixedRange:[3,3],
      styleMappings:[{name:"Legal",level:4}]});
    expect(parseTocInstruction(raw+" \\h")).toMatchObject({hyperlinks:true,tcMixedRange:[3,3]});
    expect(parseTocInstruction(raw+" \\h \\h")).toBeUndefined();
    expect(parseTocInstruction('TOC \\u \\f A \\l "2-3"')).toMatchObject({useOutline:true,tcMixedRange:[2,3]});
    expect(parseTocInstruction('TOC \\t "Legal,4" \\f A')).toMatchObject({customOnly:true,tcMixedRange:[1,9]});
  });
  it("merges distinct paragraphs in source order and preserves omitted labels across DOCX",async()=>{
    const state=fixture(),before=JSON.stringify(state);
    const headings=collectQualifiedTocHeadings(state,parseTocInstruction(raw)!)!;
    expect(headings.map(h=>[h.text,h.level])).toEqual([["First",1],["Marked",3],["No page",3],["Custom",4],["Last",2]]);
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state)).toEqual(["First\t1","Marked\t1","No page","Custom\t1","Last\t1"]);
    expect(JSON.stringify(state)).toBe(before);
    expect(refreshTableOfContentsConvergently(result.state).status).toBe("unchanged");
    const reopened=createEditorStateFromDocument(await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document)));
    expect(entries(reopened)).toEqual(entries(result.state));
    expect(refreshTableOfContentsConvergently(reopened).status).toBe("unchanged");
  });
  it("supports custom-only style mapping plus TC without adding built-in headings",()=>{
    const state=fixture(' TOC \\t "Legal,4" \\f A \\l "3-3" ');
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state)).toEqual(["Marked\t1","No page","Custom\t1"]);
  });
  it("preserves the cache on overlapping sources or caller caps",()=>{
    const state=fixture(raw,true);
    expect(refreshTableOfContentsConvergently(state)).toMatchObject({status:"unsupported",state});
    const normal=fixture();
    expect(updateTableOfContents(normal,()=>1,2)).toBe(normal);
    expect(updateTableOfContents(normal,()=>undefined)).toBe(normal);
  });
});

function cachedParagraphs(state:EditorState){
  const blocks=getDocumentSections(state.document)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).filter(b=>b.type==="paragraph");
}
function checkMixedTargets(state:EditorState){
  const cached=cachedParagraphs(state);
  expect(cached.map(getParagraphText)).toEqual(["First\t1","Marked\t1","No page","Custom\t1","Last\t1"]);
  const links=cached.map(p=>p.runs[0]!.styles?.link);
  expect(links.every(l=>l?.startsWith("#"))).toBe(true);
  expect(new Set(links).size).toBe(5);
  const bookmarks=Object.values(state.document.bookmarks!.items);
  const blocks=getDocumentSections(state.document)[0]!.blocks;
  const text=["First","Body suffix","Body suffix","Custom","Last"];
  const offsets=[0,4,11,0,0];
  for(const [i,p] of cached.entries()){
    const nav=resolveTocLinkNavigation(state,p.id,1);
    expect(nav?.document).toBe(state.document);
    const target=blocks.find(b=>b.id===nav?.selection.focus.paragraphId);
    if(target?.type!=="paragraph"||!nav)throw Error("Missing mixed target");
    expect(getParagraphText(target)).toBe(text[i]);
    expect(positionToParagraphOffset(target,nav.selection.focus)).toBe(offsets[i]);
    const bm=bookmarks.find(b=>"#"+b.name===links[i]);
    expect(bm?.start?.paragraphId).toBe(target.id);
    expect(bm?.start?.offset).toBe(offsets[i]);
    expect(bm?.end?.offset).toBe(i===1||i===2?offsets[i]:getParagraphLength(target));
  }
}
describe("F4A3B linked mixed TOC cache",()=>{
  it("uses full paragraph targets for headings and collapsed targets for TC markers, including DOCX reimport",async()=>{
    const state=fixture(raw+" \\h"),before=JSON.stringify(state);
    const result=refreshLinkedTableOfContents(state);
    expect(result.status).toBe("updated");
    checkMixedTargets(result.state);
    expect(JSON.stringify(state)).toBe(before);
    expect(refreshLinkedTableOfContents(result.state)).toMatchObject({status:"unchanged",state:result.state});
    const reopened=createEditorStateFromDocument(await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document)));
    checkMixedTargets(reopened);
    expect(refreshLinkedTableOfContents(reopened).status).toBe("unchanged");
  });
  it("refuses navigation across mismatched source kinds and repairs owned links",()=>{
    const state=refreshLinkedTableOfContents(fixture(raw+" \\h")).state;
    const cached=cachedParagraphs(state);
    const section=getDocumentSections(state.document)[0]!;
    const first=cached[0]!,second=cached[1]!;
    const misdirected={...state,document:{...state.document,sections:[{...section,blocks:section.blocks.map(b=>
      b.id===first.id?{...first,runs:[{...first.runs[0]!,styles:{...first.runs[0]!.styles,link:second.runs[0]!.styles?.link}}]}:
      b.id===second.id?{...second,runs:[{...second.runs[0]!,styles:{...second.runs[0]!.styles,link:first.runs[0]!.styles?.link}}]}:b)}]}};
    expect(resolveTocLinkNavigation(misdirected,first.id,1)).toBeUndefined();
    expect(resolveTocLinkNavigation(misdirected,second.id,1)).toBeUndefined();
    const repaired=refreshLinkedTableOfContents(misdirected);
    expect(repaired.status).toBe("updated");
    checkMixedTargets(repaired.state);
    expect(refreshLinkedTableOfContents(repaired.state).status).toBe("unchanged");
  });
  it("refuses mixed hyperlinks with overlapping sources",()=>{
    const state=fixture(raw+" \\h",true);
    expect(refreshLinkedTableOfContents(state)).toMatchObject({state,status:"unsupported"});
  });
});

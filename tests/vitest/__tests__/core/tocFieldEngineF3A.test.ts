import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorParagraphNode,type EditorState} from "@/core/model.js";
import {parseTocInstruction,findQualifiedTocRegion,createTocPageNumberResolver} from "@/core/document/tocFields.js";
import {hasTableOfContents,insertTableOfContents,updateTableOfContents,updateTableOfContentsFromLayout} from "@/core/commands/tableOfContents.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
const make=()=>{
  const title=createEditorParagraph("Introduction");
  title.style={styleId:"Heading1"};
  const sub=createEditorParagraph("Section A");
  sub.style={styleId:"heading2"};
  const body=createEditorParagraph("Some content");
  return {title,sub,state:createEditorStateFromDocument(createEditorDocument([title,sub,body]))};
};
const changeBlocks=(state:EditorState,fn:(p:EditorParagraphNode)=>EditorParagraphNode):EditorState=>{
  const sections=getDocumentSections(state.document);
  return {...state,document:{...state.document,sections:sections.map(s=>({
    ...s,blocks:s.blocks.map(b=>b.type==="paragraph"?fn(b):b),
  }))}};
};
describe("F3A safe TOC graph recognition and page geometry",()=>{
  it("recognizes exact bounded TOC options, never strings containing TOC",()=>{
    expect(parseTocInstruction(' TOC \\o "1-3" \\h \\z \\u ')).toEqual({
      startLevel:1,endLevel:3,hyperlinks:true,hideWebNumbers:true,useOutline:true,
    });
    expect(parseTocInstruction('TOC \\o "2-4"')).toMatchObject({startLevel:2,endLevel:4});
    for(const raw of [
      'IF "TOC" = "TOC" "yes" "no"',
      'TOC \\o "1-3" \\f A \\h',
      'TOC \\o "1-3" \\o "2-4"',
      'TOC \\o "5-3"',
      'TOC \\o "0-3"',
      'TOC \\o "1-3" \\h \\h',
      'TOC \\t "Heading 1,10"',
      'TOC \\o "1-3" \\* MERGEFORMAT',
      'TOC \\o "1-3',
    ])expect(parseTocInstruction(raw)).toBeUndefined();
  });
  it("updates generated flat TOC and preserves its control runs on changed heading",()=>{
    const {title,state}=make();
    const inserted=insertTableOfContents(state,()=>3);
    expect(hasTableOfContents(inserted)).toBe(true);
    const region=findQualifiedTocRegion(getDocumentSections(inserted.document)[0]!.blocks);
    expect(region).toMatchObject({startLevel:1,endLevel:3});
    expect(updateTableOfContents(inserted,()=>3)).toBe(inserted);
    const modified=changeBlocks(inserted,p=>p.id===title.id
      ? {...p,runs:p.runs.map(r=>({...r,text:"Changed title"}))}:p);
    const s=getDocumentSections(modified.document)[0]!;
    const beforeHead=(s.blocks[region!.startBlockIndex] as EditorParagraphNode).runs;
    const beforeTail=(s.blocks[region!.endBlockIndex] as EditorParagraphNode).runs;
    const updated=updateTableOfContents(modified,()=>8);
    const blocks=getDocumentSections(updated.document)[0]!.blocks;
    expect(getParagraphText(blocks[region!.startBlockIndex+1] as EditorParagraphNode))
      .toBe("Changed title\t8");
    expect((blocks[region!.startBlockIndex] as EditorParagraphNode).runs).toEqual(beforeHead);
    expect((blocks[region!.endBlockIndex] as EditorParagraphNode).runs).toEqual(beforeTail);
    expect(updateTableOfContents(updated,()=>8)).toBe(updated);
    expect(updateTableOfContents(modified)).toBe(modified);
  });
  it("preserves unsupported instructions, locks, dirty controls, and rich results",()=>{
    const {state}=make();
    const inserted=insertTableOfContents(state,()=>1);
    const region=findQualifiedTocRegion(getDocumentSections(inserted.document)[0]!.blocks)!;
    const modify=(kind:"unsupported"|"locked"|"dirty"|"rich"):EditorState=>
      changeBlocks(inserted,p=>{
        const blocks=getDocumentSections(inserted.document)[0]!.blocks;
        const index=blocks.findIndex(b=>b.id===p.id);
        if(kind==="rich"&&index===region.startBlockIndex+1)
          return {...p,runs:[...p.runs,{id:"new",kind:"text",text:" extra"}]};
        if(index!==region.startBlockIndex)return p;
        const runs=p.runs.map(r=>r.kind==="fieldInstruction"&&kind==="unsupported"
          ? {...r,fieldInstruction:' IF "TOC" = "TOC" "yes" "no" '}
          : r.kind==="fieldChar"&&r.fieldChar.kind==="begin"&&kind==="locked"
            ? {...r,fieldChar:{...r.fieldChar,fieldLock:true}}
            : r.kind==="fieldChar"&&r.fieldChar.kind==="begin"&&kind==="dirty"
              ? {...r,fieldChar:{...r.fieldChar,dirty:true}}:r);
        return {...p,runs};
      });
    for(const kind of ["unsupported","locked","dirty","rich"] as const){
      const altered=modify(kind);
      expect(hasTableOfContents(altered)).toBe(false);
      expect(updateTableOfContents(altered,()=>2)).toBe(altered);
    }
  });
  it("uses physical pages and restarted numbering without guessing unsupported labels",()=>{
    const {title,state}=make();
    const s=getDocumentSections(state.document)[0]!;
    const doc={...state.document,sections:[{...s,pageNumbering:{start:8,format:"decimal"},blocks:s.blocks}]};
    const layout=projectDocumentLayout(doc);
    const pages=createTocPageNumberResolver(doc,layout);
    expect(pages(title.id)).toBe(8);
    expect(pages("unknown-heading")).toBeUndefined();
    const inserted=insertTableOfContents({...state,document:doc});
    const updated=updateTableOfContentsFromLayout(inserted,projectDocumentLayout(inserted.document));
    const region=findQualifiedTocRegion(getDocumentSections(updated.document)[0]!.blocks)!;
    const entry=getDocumentSections(updated.document)[0]!.blocks[region.startBlockIndex+1] as EditorParagraphNode;
    expect(getParagraphText(entry)).toBe("Introduction\t8");
    const roman={...doc,sections:[{...s,pageNumbering:{start:8,format:"upperRoman"}}]};
    expect(createTocPageNumberResolver(roman,projectDocumentLayout(roman))(title.id)).toBe("VIII");
    const unknown={...doc,sections:[{...s,pageNumbering:{start:8,format:"none"}}]};
    expect(createTocPageNumberResolver(unknown,projectDocumentLayout(unknown))(title.id)).toBeUndefined();
  });
  it("preserves unsupported TOC instructions on canonical DOCX round-trip",async()=>{
    const {state}=make();
    const inserted=insertTableOfContents(state,()=>2);
    const before=getDocumentSections(inserted.document)[0]!.blocks as EditorParagraphNode[];
    const start=before.find(p=>p.runs.some(r=>r.kind==="fieldInstruction"))!;
    const modified=changeBlocks(inserted,p=>p.id===start.id?{...p,runs:p.runs.map(r=>
      r.kind==="fieldInstruction"?{...r,fieldInstruction:' TOC \\o "1-3" \\f "A" '}:r)}:p);
    const imported=await importDocxToEditorDocument(await exportEditorDocumentToDocx(modified.document));
    const instructions=getDocumentSections(imported)[0]!.blocks.flatMap(b=>b.type==="paragraph"
      ? b.runs.flatMap(r=>r.kind==="fieldInstruction"?[r.fieldInstruction]:[]):[]);
    expect(instructions.join("")).toContain('TOC \\o "1-3" \\f "A"');
  });
});

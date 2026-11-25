import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorState,type EditorParagraphStyle} from "@/core/model.js";
import {createTocOutlineResolver} from "@/core/document/tocOutline.js";
import {insertTableOfContents,updateTableOfContents} from "@/core/commands/tableOfContents.js";
import {parseTocInstruction,findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {refreshTableOfContentsConvergently} from "@/core/document/tocConvergence.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const paragraph=(text:string,style:EditorParagraphStyle)=>{
  const p=createEditorParagraph(text);p.style=style;return p;
};
const fixture=()=>{
  const ps=[
    paragraph("Direct",{outlineLevel:1}),
    paragraph("Inherited",{styleId:"child"}),
    paragraph("Body override",{styleId:"child",outlineLevel:9}),
    paragraph("Too deep",{outlineLevel:5}),
    paragraph("Heading",{styleId:"heading1"}),
    paragraph("Reset",{styleId:"child",outlineLevel:null}),
  ];
  const doc=createEditorDocument(ps);
  doc.styles={...doc.styles,
    parent:{id:"parent",name:"Parent",type:"paragraph",paragraphStyle:{outlineLevel:2}},
    child:{id:"child",name:"Child",type:"paragraph",basedOn:"parent"},
  };
  return {ps,doc,state:createEditorStateFromDocument(doc)};
};
const entries=(state:EditorState)=>{
  const blocks=getDocumentSections(state.document)[0]!.blocks;
  const region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).map(b=>b.type==="paragraph"?getParagraphText(b):"");
};
describe("F3F effective TOC outline levels",()=>{
  it("resolves direct levels, inherited levels and explicit body overrides",()=>{
    const {ps,doc}=fixture();
    const resolve=createTocOutlineResolver(doc);
    expect(ps.map(resolve)).toEqual([2,3,null,6,1,null]);
    expect(parseTocInstruction("TOC \\u")).toMatchObject({startLevel:1,endLevel:9,useOutline:true});
  });
  it("uses one outline rule for creation, refresh and convergence",()=>{
    const {state}=fixture();
    const inserted=insertTableOfContents(state,()=>1);
    expect(entries(inserted)).toEqual(["Direct\t1","Inherited\t1","Heading\t1"]);
    expect(updateTableOfContents(inserted,()=>1)).toBe(inserted);
    expect(refreshTableOfContentsConvergently(inserted).status).toBe("unchanged");
  });
  it("preserves the explicit level 9 and inherited heading selection through DOCX",async()=>{
    const {doc,ps}=fixture();
    // Null is an editor-local reset; explicit OOXML body level 9 is the
    // round-trip contract verified here.
    const section=getDocumentSections(doc)[0]!;
    const source={...doc,sections:[{...section,blocks:ps.slice(0,5)}]};
    const inserted=insertTableOfContents(createEditorStateFromDocument(source),()=>1);
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(inserted.document));
    const blocks=getDocumentSections(reopened)[0]!.blocks;
    const body=blocks.find(b=>b.type==="paragraph"&&getParagraphText(b)==="Body override");
    expect(body?.type==="paragraph"?body.style?.outlineLevel:undefined).toBe(9);
    const state=createEditorStateFromDocument(reopened);
    expect(entries(state)).toEqual(["Direct\t1","Inherited\t1","Heading\t1"]);
    expect(refreshTableOfContentsConvergently(state).status).toBe("unchanged");
  });
  it("refuses missing and cyclic style chains instead of dropping cached entries",()=>{
    const {state}=fixture();
    const inserted=insertTableOfContents(state,()=>1);
    const child=inserted.document.styles!.child!;
    for(const basedOn of ["missing","child"]){
      const bad={...inserted,document:{...inserted.document,styles:{
        ...inserted.document.styles,child:{...child,basedOn},
      }}};
      expect(refreshTableOfContentsConvergently(bad)).toMatchObject({state:bad,status:"unsupported",passes:0});
      expect(updateTableOfContents(bad,()=>1)).toBe(bad);
    }
  });
});

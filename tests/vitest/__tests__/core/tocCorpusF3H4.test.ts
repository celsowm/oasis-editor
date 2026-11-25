import {describe,expect,it} from "vitest";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,basename} from "node:path";
import {DOMParser,type Element as XmlElement} from "@xmldom/xmldom";
import JSZip from "jszip";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,paragraphOffsetToPosition,type EditorParagraphNode} from "@/core/model.js";
import {buildFieldStoryGraph} from "@/core/document/fieldStoryGraph.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {findQualifiedTocRegion,createTocPageNumberResolver} from "@/core/document/tocFields.js";
import {collectQualifiedTocHeadings} from "@/core/commands/tableOfContents.js";
import {resolveTocLinkNavigation} from "@/core/document/tocLinkNavigation.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {getParagraphText} from "@/core/model.js";
import {refreshTableOfContentsConvergently} from "@/core/document/tocConvergence.js";
import {refreshLinkedTableOfContents} from "@/core/document/tocLinks.js";
import {hasNestedTocPageRefs,refreshNestedTocPageRefs} from "@/core/document/tocNestedPageRefs.js";

const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
type XmlField={code:string;children:XmlField[];separated:boolean;closed:boolean};
const attr=(el:XmlElement,name:string)=>el.getAttributeNS(W,name)??"";
const command=(f:XmlField)=>parseFieldInstruction(f.code).command;
function descendants(f:XmlField):XmlField[]{return f.children.flatMap(c=>[c,...descendants(c)]);}
function inventory(xml:string){
  const doc=new DOMParser().parseFromString(xml,"application/xml");
  const roots:XmlField[]=[],stack:XmlField[]=[];
  const bookmarks:string[]=[],links:string[]=[],galleries:string[]=[];
  const add=(f:XmlField)=>{
    const parent=stack.at(-1);
    (parent?parent.children:roots).push(f);
  };
  function walk(el:XmlElement):void{
    const name=el.namespaceURI===W?el.localName:"";
    if(name==="fldChar"){
      const kind=attr(el,"fldCharType");
      if(kind==="begin"){
        const f={code:"",children:[],separated:false,closed:false};
        add(f);stack.push(f);
      }else if(kind==="separate"&&stack.length)stack.at(-1)!.separated=true;
      else if(kind==="end"&&stack.length)stack.pop()!.closed=true;
    }else if(name==="instrText"){
      const active=stack.at(-1);
      if(active&&!active.separated)active.code+=el.textContent??"";
    }else if(name==="fldSimple"){
      const f={code:attr(el,"instr"),children:[],separated:true,closed:true};
      add(f);
    }else if(name==="bookmarkStart")bookmarks.push(attr(el,"name"));
    else if(name==="hyperlink"&&attr(el,"anchor"))links.push(attr(el,"anchor"));
    else if(name==="docPartGallery")galleries.push(attr(el,"val"));
    for(let i=0;i<el.childNodes.length;i++){
      const child=el.childNodes.item(i);
      if(child?.nodeType===1)walk(child as XmlElement);
    }
  }
  if(doc.documentElement)walk(doc.documentElement);
  const tocs=roots.flatMap(f=>[f,...descendants(f)]).filter(f=>command(f)==="TOC");
  const refs=tocs.flatMap(f=>descendants(f).filter(c=>command(c)==="PAGEREF"));
  const targetNames=refs.map(f=>parseFieldInstruction(f.code).tokens[1]?.value??"").filter(Boolean);
  return {tocCodes:tocs.map(f=>f.code.trim()),pageRefCodes:refs.map(f=>f.code.trim()),
    complete:tocs.every(f=>f.closed&&f.separated)&&refs.every(f=>f.closed&&f.separated),
    targetNames,targetsPresent:targetNames.filter(n=>bookmarks.includes(n)),bookmarks,links,galleries};
}
const files=[
  "modelo_docx_com_sumario.docx",
  "tests/vitest/__tests__/word-parity/fixtures/word-authored-lorem.docx",
  "tests/vitest/__tests__/word-parity/fixtures/documento_complexo.docx",
  "tests/vitest/__tests__/word-parity/fixtures/lorem_ipsum_complex_document.docx",
];
const sorted=(xs:string[])=>[...xs].sort();
const readXml=async(zip:JSZip,path:string)=>await zip.file(path)?.async("string")??"";
const bytes=(file:string)=>Uint8Array.from(readFileSync(resolve(file))).buffer;

describe("F3H4A real repository TOC corpus",()=>{
  for(const file of files)it("preserves and classifies "+basename(file),async()=>{
    const source=bytes(file);
    const zip=await JSZip.loadAsync(source);
    const original=inventory(await readXml(zip,"word/document.xml"));
    const appXml=await readXml(zip,"docProps/app.xml");
    const application=appXml?new DOMParser().parseFromString(appXml,"application/xml")
      .getElementsByTagNameNS("*","Application").item(0)?.textContent??null:null;
    if(file===files[0])expect(original.tocCodes.length,"named TOC fixture must actually contain a TOC").toBeGreaterThan(0);
    if(!original.tocCodes.length){
      console.info("TOC_CORPUS",JSON.stringify({file,application,classification:"no-toc"}));
      return;
    }
    const imported=await importDocxToEditorDocument(source);
    const initial=createEditorStateFromDocument(imported);
    const sections=getDocumentSections(imported);
    const graphInfo=sections.map((s,sectionIndex)=>{
      const ps=s.blocks.filter((b):b is EditorParagraphNode=>b.type==="paragraph");
      const graph=buildFieldStoryGraph(ps);
      return {sectionIndex,diagnostics:graph.diagnostics.map(d=>d.kind),
        tocs:graph.spans.filter(f=>parseFieldInstruction(f.code.map(c=>c.kind==="instruction"?c.raw:"").join("")).command==="TOC")
          .map(f=>({begin:f.begin.paragraphIndex,end:f.end?.paragraphIndex,
            nested:f.result.filter(p=>p.kind==="nested").length,locked:!!f.beginMarker.fieldLock,dirty:!!f.beginMarker.dirty})),
        paragraphCount:ps.length};
    });
    const chosen=graphInfo.find(s=>s.tocs.length);
    let state=initial;
    if(chosen){
      const ps=sections[chosen.sectionIndex]!.blocks.filter((b):b is EditorParagraphNode=>b.type==="paragraph");
      const region=chosen.tocs[0]!;
      const outside=ps.find((_,i)=>i<region.begin||i>(region.end??region.begin))??ps[0];
      if(outside){
        const position=paragraphOffsetToPosition(outside,0);
        state={...initial,activeZone:"main",activeSectionIndex:chosen.sectionIndex,
          selection:{anchor:position,focus:position}};
      }
    }
    const section=sections[state.activeSectionIndex??0];
    const flat=section&&findQualifiedTocRegion(section.blocks);
    const nested=hasNestedTocPageRefs(state);
    const snapshot=JSON.stringify(state);
    // Keep the actual production dispatch, including refusal for rich fields.
    const refresh=(s:typeof state)=>nested?refreshNestedTocPageRefs(s):
      flat?.hyperlinks?refreshLinkedTableOfContents(s):refreshTableOfContentsConvergently(s);
    const result=refresh(state);
    const qualified=result.status==="updated"||result.status==="unchanged";
    const classification=qualified?(nested?"nested-refresh":"flat-refresh"):"preservation-only";
    const exported=await exportEditorDocumentToDocx(result.state.document);
    const outputZip=await JSZip.loadAsync(exported);
    const roundTrip=inventory(await readXml(outputZip,"word/document.xml"));
    const report={file,application,classification,status:result.status,passes:result.passes,
      updatedEntries:result.updatedEntries,flat:!!flat,nested,graphInfo,
      source:original,exported:roundTrip};
    const dir=process.env.OASIS_TOC_CORPUS_REPORT;
    if(dir){
      mkdirSync(dir,{recursive:true});
      writeFileSync(resolve(dir,basename(file)+".json"),JSON.stringify(report,null,2));
      writeFileSync(resolve(dir,basename(file)+".roundtrip.docx"),new Uint8Array(exported));
    }
    console.info("TOC_CORPUS",JSON.stringify(report));
    expect(JSON.stringify(state),"source state must remain immutable").toBe(snapshot);
    if(qualified){
      expect(refresh(result.state).status,"certified refresh must be idempotent").toBe("unchanged");
    }else expect(result.state,"unsupported corpus shapes must roll back").toBe(state);
    expect(roundTrip.tocCodes).toEqual(original.tocCodes);
    // Flat regeneration may introduce links, but cannot discard a nested
    // PAGEREF instruction or any original referenced bookmark.
    expect(roundTrip.pageRefCodes).toEqual(original.pageRefCodes);
    expect(sorted(roundTrip.targetsPresent)).toEqual(sorted(original.targetsPresent));
    expect(roundTrip.complete).toBe(original.complete);
    for(const gallery of original.galleries)expect(roundTrip.galleries).toContain(gallery);
    for(const link of original.links.filter(n=>original.targetNames.includes(n)))expect(roundTrip.links).toContain(link);
    const reopened=await importDocxToEditorDocument(exported);
    expect(getDocumentSections(reopened).length).toBeGreaterThan(0);
    // The observed Mac Word fixture is an actual refresh acceptance case,
    // not merely preservation evidence. A later refusal must fail CI.
    if(file===files[0]){
      expect(application).toBe("Microsoft Macintosh Word");
      expect(classification).toBe("flat-refresh");
      expect(result.status).toBe("updated");
      expect(result.updatedEntries).toBe(13);
      expect(roundTrip.bookmarks).toHaveLength(13);
      expect(new Set(roundTrip.links).size).toBe(13);
      const opened=createEditorStateFromDocument(reopened);
      const blocks=getDocumentSections(reopened)[0]!.blocks;
      const region=findQualifiedTocRegion(blocks);
      expect(region).toBeDefined();
      const headings=collectQualifiedTocHeadings(opened,region!);
      expect(headings).toHaveLength(13);
      const pages=createTocPageNumberResolver(reopened,projectDocumentLayout(reopened));
      const entries=blocks.slice(region!.startBlockIndex+1,region!.endBlockIndex);
      expect(entries).toHaveLength(13);
      for(const [i,entry] of entries.entries()){
        expect(entry.type).toBe("paragraph");
        if(entry.type!=="paragraph")throw Error("missing cached entry");
        const heading=headings![i]!;
        expect(pages(heading.id)).toBeDefined();
        expect(getParagraphText(entry)).toBe(heading.text+"\t"+pages(heading.id));
        const nav=resolveTocLinkNavigation(opened,entry.id,1);
        expect(nav?.selection.focus.paragraphId).toBe(heading.id);
        expect(nav?.document).toBe(opened.document);
      }
    }
  },60000);
});

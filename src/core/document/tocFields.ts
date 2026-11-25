import type {EditorBlockNode,EditorDocument,EditorLayoutDocument,EditorParagraphNode} from "@/core/model.js";
import {getDocumentSections} from "@/core/model.js";
import {buildFieldStoryGraph} from "@/core/document/fieldStoryGraph.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {createDocumentFieldContext} from "@/core/document/fieldDocumentContext.js";
import {formatSectionPageLabel} from "@/core/format/pageNumberFormat.js";

export interface TocFieldSettings {
  startLevel:number;
  endLevel:number;
  hyperlinks:boolean;
  hideWebNumbers:boolean;
  useOutline:boolean;
}
export interface QualifiedTocRegion extends TocFieldSettings {
  startBlockIndex:number;
  endBlockIndex:number;
}

/** Word TOC switch grammar (bounded F3A subset). Unknown and duplicate
 * switches are not ignored; quoted field-name occurrences are not commands. */
export function parseTocInstruction(raw:string):TocFieldSettings|undefined{
  const parsed=parseFieldInstruction(raw);
  if(parsed.error||parsed.command!=="TOC")return undefined;
  const args=parsed.tokens.slice(1);
  let startLevel:number|undefined,endLevel:number|undefined;
  let hyperlinks=false,hideWebNumbers=false,useOutline=false;
  const seen=new Set<string>();
  for(let i=0;i<args.length;i++){
    const token=args[i]!;
    if(token.kind!=="switch")return undefined;
    const sw=token.value.toLowerCase();
    if(seen.has(sw))return undefined;
    seen.add(sw);
    if(sw==="o"){
      const arg=args[++i];
      if(arg?.kind!=="quoted")return undefined;
      const match=/^([1-9])-([1-9])$/.exec(arg.value);
      if(!match)return undefined;
      startLevel=Number(match[1]);endLevel=Number(match[2]);
      if(startLevel>endLevel)return undefined;
    }else if(sw==="h")hyperlinks=true;
    else if(sw==="z")hideWebNumbers=true;
    else if(sw==="u")useOutline=true;
    else return undefined;
  }
  // We only regenerate generated outline-based TOCs.
  if(startLevel===undefined||endLevel===undefined)return undefined;
  return {startLevel,endLevel,hyperlinks,hideWebNumbers,useOutline};
}

function safeMarkerRun(p:EditorParagraphNode):boolean{
  return !p.sdtWrappers?.length&&!p.numberingRevision&&!p.dropCap&&
    p.runs.every(r=>!r.revision&&!r.revisionRangeMarker&&!r.sdtWrappers?.length&&
      !r.styles?.hidden&&!r.styles?.rtl);
}
function isPlainTocEntry(p:EditorParagraphNode):boolean{
  if(!safeMarkerRun(p)||p.list||p.dropCap||p.runs.length!==1)return false;
  const run=p.runs[0]!;
  return run.kind==="text"&&run.text.length<=8192&&run.text.includes("\t")&&
    !/[\r\n]/.test(run.text);
}

/** Only regenerate complete, flat TOC regions: the begin/instruction/separator
 * occupy one marker paragraph; a separate end marker closes plain text entries.
 * Other document content is never rewritten, even on malformed TOC markup. */
export function findQualifiedTocRegion(blocks:readonly EditorBlockNode[]):QualifiedTocRegion|undefined{
  const found:QualifiedTocRegion[]=[];
  for(let i=0;i<blocks.length;){
    if(blocks[i]?.type!=="paragraph"){i++;continue;}
    const offset=i;
    const paragraphs:EditorParagraphNode[]=[];
    while(i<blocks.length&&blocks[i]?.type==="paragraph"){
      paragraphs.push(blocks[i] as EditorParagraphNode);i++;
    }
    const graph=buildFieldStoryGraph(paragraphs);
    if(graph.diagnostics.length)continue;
    for(const span of graph.spans){
      if(span.parentIndex!==null||!span.separator||!span.end||span.beginMarker.fieldLock||
         span.beginMarker.dirty||span.code.some(part=>part.kind!=="instruction")||
         span.begin.paragraphIndex!==span.separator.paragraphIndex||
         span.begin.paragraphIndex>=span.end.paragraphIndex)continue;
      const head=paragraphs[span.begin.paragraphIndex]!,tail=paragraphs[span.end.paragraphIndex]!;
      if(!safeMarkerRun(head)||!safeMarkerRun(tail)||
         span.begin.runIndex!==0||span.separator.runIndex!==head.runs.length-1||
         span.end.runIndex!==0||tail.runs.length!==1||
         head.runs[0]?.kind!=="fieldChar"||
         head.runs.at(-1)?.kind!=="fieldChar"||
         tail.runs[0]?.kind!=="fieldChar")continue;
      const options=parseTocInstruction(span.code.map(part=>part.kind==="instruction"?part.raw:"").join(""));
      if(!options)continue;
      const start=span.begin.paragraphIndex,end=span.end.paragraphIndex;
      if(!paragraphs.slice(start+1,end).every(isPlainTocEntry))continue;
      // Refuse nested or otherwise structured cached content, including
      // marker-bearing entries that the regeneration would discard.
      if(span.result.length!==end-start-1||
         span.result.some((part,j)=>part.kind!=="run"||part.point.paragraphIndex!==start+j+1))continue;
      found.push({...options,startBlockIndex:offset+start,endBlockIndex:offset+end});
    }
  }
  return found.length===1?found[0]:undefined;
}

/** Read-only, geometry-certified heading page numbers; never infer from
 * paragraph order. A missing or uncertain physical section/page is unresolved. */
export function createTocPageNumberResolver(
  document:EditorDocument,layout:EditorLayoutDocument,
):(headingId:string)=>number|string|undefined{
  const context=createDocumentFieldContext(document,layout);
  const sections=getDocumentSections(document);
  const owners=new Map<string,number|null>();
  sections.forEach((section,s)=>{
    for(const block of section.blocks){
      if(block.type!=="paragraph")continue;
      owners.set(block.id,owners.has(block.id)?null:s);
    }
  });
  return (headingId:string):number|string|undefined=>{
    const owner=owners.get(headingId);
    if(owner===undefined||owner===null)return undefined;
    const section=sections[owner]!;
    const page=context.pageIndexAt(headingId,0);
    if(page===undefined)return undefined;
    const facts=context.forPage(page);
    // Ensure the measured heading really belongs to its source section.
    if(facts.sectionNumber!==owner+1||facts.pageNumber===undefined)return undefined;
    return formatSectionPageLabel(facts.pageNumber,section.pageNumbering?.format);
  };
}

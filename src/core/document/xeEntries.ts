import type {EditorDocument,EditorLayoutDocument,EditorParagraphNode} from "@/core/model.js";
import {getDocumentSections} from "@/core/model.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {buildFieldStoryGraph} from "./fieldStoryGraph.js";
import {createDocumentFieldContext} from "./fieldDocumentContext.js";
import {formatSectionPageLabel} from "@/core/format/pageNumberFormat.js";

export type XeReference =
  | {kind:"page"}
  | {kind:"crossReference";text:string}
  | {kind:"bookmarkRange";bookmark:string};

export interface XeInstruction {
  /** Display path; keep authored case and whitespace. */
  path:readonly string[];
  /** Explicit index type; default selection is a separate INDEX policy. */
  identifier?:string;
  boldPage:boolean;
  italicPage:boolean;
  reference:XeReference;
}
export interface XeOccurrence extends XeInstruction {
  sectionIndex:number;
  paragraphId:string;
  runId:string;
  offset:number;
  raw:string;
}
export interface XePage {
  physicalPageIndex:number;
  label:string;
}

const validText=(value:string,max:number)=>value.length<=max&&!!value.trim()&&
  !/[\u0000-\u001f\u007f]/.test(value);

/** Bounded XE compiler. No index mutation, locale sorting or range expansion.
 * Colon-separated plain labels qualify; escaped colons, formatting within
 * the instruction and unknown switches must remain opaque until qualified.
 */
export function parseXeInstruction(raw:string):XeInstruction|undefined{
  const parsed=parseFieldInstruction(raw);
  if(parsed.error||parsed.command!=="XE")return undefined;
  const [entry,...args]=parsed.tokens.slice(1);
  if(entry?.kind!=="quoted"||!validText(entry.value,4096)||entry.value.includes("\\"))return undefined;
  const path=entry.value.split(":");
  if(path.length>9||path.some(p=>!validText(p,1024)))return undefined;
  let identifier:string|undefined,boldPage=false,italicPage=false;
  let reference:XeReference={kind:"page"};
  const seen=new Set<string>();
  for(let i=0;i<args.length;i++){
    const token=args[i]!;
    if(token.kind!=="switch")return undefined;
    const sw=token.value.toLowerCase();
    if(seen.has(sw))return undefined;
    seen.add(sw);
    if(sw==="b"){boldPage=true;continue;}
    if(sw==="i"){italicPage=true;continue;}
    if(sw!=="f"&&sw!=="r"&&sw!=="t")return undefined;
    const value=args[++i];
    if(!value||value.kind==="switch")return undefined;
    if(sw==="f"){
      if(!/^[A-Za-z]$/.test(value.value))return undefined;
      identifier=value.value;
      continue;
    }
    if(reference.kind!=="page")return undefined;
    if(sw==="r"){
      if(!/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(value.value))return undefined;
      reference={kind:"bookmarkRange",bookmark:value.value};
    }else{
      if(value.kind!=="quoted"||!validText(value.value,4096))return undefined;
      reference={kind:"crossReference",text:value.value};
    }
  }
  // Formatting a cross-reference is not the same as emphasizing a page.
  if(reference.kind==="crossReference"&&(boldPage||italicPage))return undefined;
  return {path,...(identifier===undefined?{}:{identifier}),boldPage,italicPage,reference};
}

/** Complete inventory for the deliberately narrow top-level main story.
 * Refuse malformed XE instead of silently dropping it from a future INDEX.
 * Other stories and nested containers are not scanned or rewritten.
 */
export function collectXeOccurrences(document:EditorDocument):XeOccurrence[]|undefined{
  const result:XeOccurrence[]=[];
  const seenIds=new Set<string>();
  for(const [sectionIndex,section] of getDocumentSections(document).entries()){
    const paragraphs:EditorParagraphNode[]=[];
    for(const block of section.blocks){
      if(block.type!=="paragraph"||seenIds.has(block.id)||
        block.runs.some(r=>r.kind==="textBox"||r.kind==="opaque"))return undefined;
      seenIds.add(block.id);
      paragraphs.push(block);
    }
    const graph=buildFieldStoryGraph(paragraphs);
    if(graph.diagnostics.length)return undefined;
    for(const span of graph.spans){
      const raw=span.code.map(part=>part.kind==="instruction"?part.raw:"").join("");
      const parsed=parseFieldInstruction(raw);
      // Lexer failures intentionally have a null command. Detect a lexical
      // XE head as well, including malformed quotes or resource-limit input.
      if(parsed.command!=="XE"&&!/^\s*XE(?=\s|\\|"|$)/i.test(raw))continue;
      const entry=parseXeInstruction(raw);
      if(!entry||span.parentIndex!==null||!span.end||span.separator||
        span.begin.paragraphIndex!==span.end.paragraphIndex||
        span.beginMarker.fieldLock||span.beginMarker.dirty||
        span.code.some(part=>part.kind!=="instruction")||span.result.length)return undefined;
      const p=paragraphs[span.begin.paragraphIndex]!;
      if(p.sdtWrappers?.length||p.numberingRevision||p.dropCap||
        new Set(p.runs.map(r=>r.id)).size!==p.runs.length||
        p.runs.slice(span.begin.runIndex,span.end.runIndex+1).some(r=>
          r.text.length||r.revision||r.revisionRangeMarker||r.sdtWrappers?.length||r.styles?.link||
          (r.kind!=="fieldChar"&&r.kind!=="fieldInstruction")))return undefined;
      result.push({...entry,sectionIndex,paragraphId:p.id,runId:span.begin.runId,offset:span.begin.offset,raw});
      if(result.length>4096)return undefined;
    }
  }
  return result;
}

/** Physical order and printed labels are distinct (section restarts may
 * repeat labels). Cross-references and bookmark ranges are not point pages.
 */
export function resolveXePointPage(
  document:EditorDocument,layout:EditorLayoutDocument,entry:XeOccurrence,
  context=createDocumentFieldContext(document,layout),
):XePage|undefined{
  if(entry.reference.kind!=="page")return undefined;
  const physicalPageIndex=context.pageIndexAt(entry.paragraphId,entry.offset);
  if(physicalPageIndex===undefined)return undefined;
  const facts=context.forPage(physicalPageIndex);
  if(facts.sectionNumber!==entry.sectionIndex+1||facts.pageNumber===undefined)return undefined;
  const section=getDocumentSections(document)[entry.sectionIndex];
  if(!section)return undefined;
  const label=formatSectionPageLabel(facts.pageNumber,section.pageNumbering?.format);
  return label===undefined?undefined:{physicalPageIndex,label:String(label)};
}

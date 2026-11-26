import type {EditorDocument,EditorLayoutDocument,EditorParagraphNode} from "@/core/model.js";
import {getDocumentSections} from "@/core/model.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {buildFieldStoryGraph} from "./fieldStoryGraph.js";
import {createDocumentFieldContext} from "./fieldDocumentContext.js";
import {formatSectionPageLabel} from "@/core/format/pageNumberFormat.js";

export interface TcInstruction {
  text:string;
  level:number;
  /** Explicit table identifier. An omitted identifier remains distinguishable. */
  identifier?:string;
  omitPageNumber:boolean;
}
export interface TcOccurrence extends TcInstruction {
  sectionIndex:number;
  paragraphId:string;
  runId:string;
  /** Source UTF-16 offset of the zero-width field begin, not heading start. */
  offset:number;
  raw:string;
}

/** Bounded grammar for Word TC fields. Unknown switches fail closed. */
export function parseTcInstruction(raw:string):TcInstruction|undefined{
  const parsed=parseFieldInstruction(raw);
  if(parsed.error||parsed.command!=="TC")return undefined;
  const [label,...args]=parsed.tokens.slice(1);
  if(!label||label.kind!=="quoted"||!label.value.trim()||label.value.length>4096||
    /[\u0000-\u001f\u007f]/.test(label.value))return undefined;
  let level=1,identifier:string|undefined,omitPageNumber=false;
  const seen=new Set<string>();
  for(let i=0;i<args.length;i++){
    const token=args[i]!;
    if(token.kind!=="switch")return undefined;
    const sw=token.value.toLowerCase();
    if(seen.has(sw))return undefined;
    seen.add(sw);
    if(sw==="n"){omitPageNumber=true;continue;}
    if(sw!=="f"&&sw!=="l")return undefined;
    const value=args[++i];
    if(!value||value.kind==="switch")return undefined;
    if(sw==="l"){
      if(!/^[1-9]$/.test(value.value))return undefined;
      level=Number(value.value);
    }else{
      if(!/^[A-Za-z]$/.test(value.value))return undefined;
      identifier=value.value;
    }
  }
  return {text:label.value,level,...(identifier===undefined?{}:{identifier}),omitPageNumber};
}

/** Read-only main-story inventory. A malformed/unsupported TC is not silently
 * dropped: undefined tells future TOC regeneration to preserve its cache.
 * Only top-level, instruction-only fields in body paragraphs are qualified.
 * Hidden formatting on TC markers is expected; no visible result is allowed.
 */
export function collectTcOccurrences(document:EditorDocument):TcOccurrence[]|undefined{
  const result:TcOccurrence[]=[];
  const sections=getDocumentSections(document);
  const seenIds=new Set<string>();
  for(const [sectionIndex,section] of sections.entries()){
    for(const b of section.blocks){
      if(seenIds.has(b.id))return undefined;
      seenIds.add(b.id);
    }
    for(let i=0;i<section.blocks.length;){
      if(section.blocks[i]?.type!=="paragraph"){i++;continue;}
      const paragraphs:EditorParagraphNode[]=[];
      while(section.blocks[i]?.type==="paragraph")paragraphs.push(section.blocks[i++] as EditorParagraphNode);
      const graph=buildFieldStoryGraph(paragraphs);
      if(graph.diagnostics.length)return undefined;
      for(const span of graph.spans){
        const raw=span.code.map(p=>p.kind==="instruction"?p.raw:"").join("");
        if(parseFieldInstruction(raw).command!=="TC")continue;
        const field=parseTcInstruction(raw);
        if(!field||span.parentIndex!==null||!span.end||span.separator||
          span.begin.paragraphIndex!==span.end.paragraphIndex||
          span.beginMarker.fieldLock||span.beginMarker.dirty||
          span.code.some(p=>p.kind!=="instruction")||span.result.length)return undefined;
        const p=paragraphs[span.begin.paragraphIndex]!;
        const runs=p.runs.slice(span.begin.runIndex,span.end.runIndex+1);
        if(p.sdtWrappers?.length||p.numberingRevision||p.dropCap||
          new Set(p.runs.map(r=>r.id)).size!==p.runs.length||
          runs.some(r=>r.text.length||r.revision||r.revisionRangeMarker||
            r.sdtWrappers?.length||r.styles?.link||
            (r.kind!=="fieldChar"&&r.kind!=="fieldInstruction")))return undefined;
        result.push({...field,sectionIndex,paragraphId:p.id,runId:span.begin.runId,
          offset:span.begin.offset,raw});
        if(result.length>2048)return undefined;
      }
    }
  }
  return result;
}

/** Resolve the printed label at the TC marker's actual offset using a
 * completed layout. No page guessed from a paragraph's first line. */
export function resolveTcPageLabel(document:EditorDocument,layout:EditorLayoutDocument,entry:TcOccurrence,context=createDocumentFieldContext(document,layout)):string|undefined{
  if(entry.omitPageNumber)return "";
  const page=context.pageIndexAt(entry.paragraphId,entry.offset);
  if(page===undefined)return undefined;
  const facts=context.forPage(page);
  if(facts.sectionNumber!==entry.sectionIndex+1||facts.pageNumber===undefined)return undefined;
  const section=getDocumentSections(document)[entry.sectionIndex];
  if(!section)return undefined;
  const label=formatSectionPageLabel(facts.pageNumber,section.pageNumbering?.format);
  return label===undefined?undefined:String(label);
}

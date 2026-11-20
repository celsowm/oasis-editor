import type {EditorDocument,EditorParagraphNode} from "@/core/model.js";
import {getDocumentSections} from "@/core/model.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {compileFieldInstruction,evaluateField} from "./fieldEvaluation.js";
import {buildFieldStoryGraph,type FieldStorySpan} from "./fieldStoryGraph.js";

export function sequenceOccurrenceKey(paragraphId:string,runIndex:number):string{
  return JSON.stringify([paragraphId,runIndex]);
}
interface Counter {value?:number; headingLevel?:number; headingGeneration?:number}

/** Resolve main-story occurrences in XML order, independently of selection,
 * pagination and cached display text. A malformed/ambiguous story is not
 * evaluated. Unsupported sequence operations poison their own identifier
 * until a definite reset; unrelated sequences are unaffected. */
export function resolveBodySequences(document:EditorDocument):Map<string,number>{
  const result=new Map<string,number>();
  const blocks=getDocumentSections(document).flatMap(s=>s.blocks);
  if(blocks.some(b=>b.type!=="paragraph")||new Set(blocks.map(b=>b.id)).size!==blocks.length)return result;
  const paragraphs=blocks as EditorParagraphNode[];
  if(paragraphs.some(p=>p.runs.some(r=>r.kind==="opaque"||r.kind==="textBox")))return result;
  const graph=buildFieldStoryGraph(paragraphs);
  if(graph.diagnostics.length)return result;
  const counters=new Map<string,Counter>();
  const byParagraph=new Map<number,FieldStorySpan[]>();
  // Nested sequence operands are not executed. Their effects on subsequent
  // numbering are not proven, so conservatively reject this entire scope.
  for(const span of graph.spans){
    const raw=span.code.map(p=>p.kind==="instruction"?p.raw:"").join("");
    if(parseFieldInstruction(raw).command!=="SEQ")continue;
    if(span.parentIndex!==null||!span.end||span.begin.paragraphIndex!==span.end.paragraphIndex)return result;
    const group=byParagraph.get(span.begin.paragraphIndex)??[];
    group.push(span);byParagraph.set(span.begin.paragraphIndex,group);
  }
  const generations=Array.from({length:9},()=>0);
  let headingUncertain=false;
  const outline=(p:EditorParagraphNode):number|null|undefined=>{
    if(p.style?.outlineLevel!==undefined)return p.style.outlineLevel;
    let id=p.style?.styleId;
    const visited=new Set<string>();
    while(id){
      if(visited.has(id))return undefined;
      visited.add(id);
      const style=document.styles?.[id];
      if(!style){
        const match=/^heading\s*([1-9])$/i.exec(id);
        if(match)return Number(match[1])-1;
        return id.toLowerCase()==="normal"||id.toLowerCase()==="caption"?null:undefined;
      }
      if(style.paragraphStyle?.outlineLevel!==undefined)return style.paragraphStyle.outlineLevel;
      id=style.basedOn;
    }
    return null;
  };
  for(const [i,p] of paragraphs.entries()){
    const level=outline(p);
    if(level===undefined)headingUncertain=true;
    else if(typeof level==="number"&&Number.isInteger(level)&&level>=0&&level<9){
      for(let k=level;k<9;k++)generations[k]!++;
    }
    for(const span of byParagraph.get(i)??[]){
      const raw=span.code.map(part=>part.kind==="instruction"?part.raw:"").join("");
      const identifier=parseFieldInstruction(raw).tokens[1]?.value.toLowerCase();
      if(!identifier) return new Map();
      const field=compileFieldInstruction(raw);
      const prior=counters.get(identifier);
      if(field?.type!=="SEQ"||!span.separator||span.code.some(x=>x.kind!=="instruction")||
        span.result.length!==1||span.result[0]?.kind!=="run"||
        p.runs[span.result[0].point.runIndex]?.kind!=="text"||
        p.runs.some(r=>r.revision||r.revisionRangeMarker||r.sdtWrappers?.length)||
        p.sdtWrappers?.length||p.numberingRevision){
        counters.set(identifier,{});continue;
      }
      const runIndex=span.result[0].point.runIndex;
      const generation=field.headingLevel===undefined?undefined:generations[field.headingLevel-1];
      let value:number|undefined;
      if(field.operation==="reset")value=field.reset;
      else if(field.operation==="repeat")value=prior?.value;
      else if(field.headingLevel!==undefined){
        if(headingUncertain) value=undefined;
        else if(prior&&prior.value===undefined)value=undefined;
        else if(!prior)value=1;
        else if(prior.headingLevel!==field.headingLevel)value=undefined;
        else value=prior.headingGeneration!==generation?1:prior.value!+1;
      }else value=prior?prior.value===undefined?undefined:prior.value+1:1;
      if(value===undefined||!Number.isSafeInteger(value)||value<1||value>1_000_000){
        counters.set(identifier,{});continue;
      }
      if(span.beginMarker.fieldLock){
        // Count only a locked occurrence whose cache agrees with the proven
        // sequence. A mismatched locked cache is not guessed from its text.
        const cached=p.runs[runIndex]!.text;
        if(evaluateField(field,{sequenceValue:value},cached).text!==cached){
          counters.set(identifier,{});continue;
        }
      }else result.set(sequenceOccurrenceKey(p.id,runIndex),value);
      counters.set(identifier,{value,headingLevel:field.operation==="repeat"?prior?.headingLevel:field.headingLevel,
        headingGeneration:field.operation==="repeat"?prior?.headingGeneration:generation});
    }
  }
  return result;
}

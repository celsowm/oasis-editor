import type {EditorBlockNode,EditorDocument,EditorParagraphNode} from "@/core/model.js";
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
/** One ordered SEQ authority for field refresh, caption authoring and export. */
export function resolveOrderedSequences(
  paragraphs:readonly EditorParagraphNode[],
  styles?:EditorDocument["styles"],
  scopes?:readonly string[],
):Map<string,number>{
  const result=new Map<string,number>();
  if(new Set(paragraphs.map(p=>p.id)).size!==paragraphs.length)return result;
  if(paragraphs.some(p=>p.runs.some(r=>r.kind==="opaque"||r.kind==="textBox")))return result;
  const graph=buildFieldStoryGraph(paragraphs);
  if(graph.diagnostics.length)return result;
  // Flattening table cells must never connect field markers from different
  // document stories. Reject uncertain cross-cell/section field spans.
  if(scopes&&graph.spans.some(span=>{
    if(!span.end)return true;
    const owner=scopes[span.begin.paragraphIndex];
    for(let i=span.begin.paragraphIndex;i<=span.end.paragraphIndex;i++)
      if(scopes[i]!==owner)return true;
    return false;
  }))return result;
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
      const style=styles?.[id];
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

/** Row-major body order includes table cells; each cell is its own story.
 * Headers, notes and text boxes do not consume main-body numbering. */
export function resolveBodySequences(document:EditorDocument):Map<string,number>{
  const paragraphs:EditorParagraphNode[]=[];
  const scopes:string[]=[];
  const visit=(blocks:readonly EditorBlockNode[],scope:string):void=>{
    for(const block of blocks){
      if(block.type==="paragraph"){paragraphs.push(block);scopes.push(scope);}
      else for(const row of block.rows)for(const cell of row.cells)
        visit(cell.blocks,"cell:"+cell.id);
    }
  };
  getDocumentSections(document).forEach((section,i)=>visit(section.blocks,"body:"+i));
  return resolveOrderedSequences(paragraphs,document.styles,scopes);
}

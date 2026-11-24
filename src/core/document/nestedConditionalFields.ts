import type {EditorParagraphNode} from "@/core/model.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {compileFieldInstruction,type ConditionalOperand,type NestedConditionalField} from "./fieldEvaluation.js";
import type {FieldStoryGraph,FieldStorySpan} from "./fieldStoryGraph.js";

/** A field nested in an IF code is a value expression, not an independent
 * editable cache target. Re-evaluate it from the document snapshot rather
 * than trusting its potentially stale cached result. */
const MARKER="\uE000OASISNESTED";
const LIMIT=4096;
const validLiteral=(value:string):boolean=>value.length<=LIMIT&&!/[\r\n\t\u0000-\u001f]/.test(value);
const numberPattern=/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const literal=(token:{kind:string;value:string}):ConditionalOperand|undefined=>{
  if(token.kind==="quoted"&&validLiteral(token.value))return {kind:"literal",value:token.value};
  if(token.kind==="word"&&numberPattern.test(token.value)&&Number.isFinite(Number(token.value)))
    return {kind:"literal",value:token.value};
  return undefined;
};

/** Qualify one complete scalar, single-paragraph IF with one or two direct
 * nested DOCVARIABLE/DOCPROPERTY operands. Reject non-operand nesting,
 * arbitrary code, locks, unresolved spans and non-token-boundary insertion.
 * No nested field cache is written or executed. */
export function compileNestedConditionalField(
  parent:FieldStorySpan,graph:FieldStoryGraph,paragraph:EditorParagraphNode,
):NestedConditionalField|undefined{
  if(parent.parentIndex!==null||parent.beginMarker.fieldLock||
     !parent.separator||!parent.end||parent.code.length>16||
     parent.result.length!==1||parent.result[0]?.kind!=="run"||
     parent.begin.paragraphIndex!==parent.end.paragraphIndex||
     parent.result[0].point.paragraphIndex!==parent.begin.paragraphIndex||
     paragraph.runs[parent.result[0].point.runIndex]?.kind!=="text")return undefined;
  const nested=parent.code.filter(p=>p.kind==="nested");
  if(nested.length===0||nested.length>2||
     parent.code.some(p=>p.kind==="run"||
       p.kind==="instruction"&&(p.raw.includes("\uE000")||p.raw.includes("\uE001"))))return undefined;
  const refs=new Map<string,ConditionalOperand>();
  let raw="";
  for(const [index,part] of parent.code.entries()){
    if(part.kind==="instruction"){raw+=part.raw;continue;}
    if(part.kind!=="nested")return undefined;
    const prev=parent.code[index-1],next=parent.code[index+1];
    // Do not inject an expression into a quoted string or another token.
    if(prev?.kind==="instruction"&&!/\s$/.test(prev.raw)||
       next?.kind==="instruction"&&!/^\s/.test(next.raw))return undefined;
    const child=graph.spans[part.fieldIndex];
    if(!child||child.parentIndex!==parent.index||child.beginMarker.fieldLock||
       !child.separator||!child.end||child.begin.paragraphIndex!==parent.begin.paragraphIndex||
       child.end.paragraphIndex!==parent.begin.paragraphIndex||
       child.code.some(p=>p.kind!=="instruction")||child.result.length!==1||
       child.result[0]?.kind!=="run"||
       paragraph.runs[child.result[0].point.runIndex]?.kind!=="text")return undefined;
    const field=compileFieldInstruction(child.code.map(p=>p.kind==="instruction"?p.raw:"").join(""));
    if(field?.type!=="DOCVARIABLE"&&field?.type!=="DOCPROPERTY")return undefined;
    const marker=MARKER+index+"\uE001";
    refs.set(marker,{kind:field.type==="DOCVARIABLE"?"document-variable":"document-property",name:field.name});
    raw+=marker;
  }
  if(raw.length>65536)return undefined;
  const parsed=parseFieldInstruction(raw);
  if(parsed.error||parsed.command!=="IF"||parsed.tokens.length!==6)return undefined;
  const [left,op,right,yes,no]=parsed.tokens.slice(1);
  if(!left||!op||!right||!yes||!no||
     op.kind!=="word"||!["=","<>","<",">","<=",">="].includes(op.value)||
     yes.kind!=="quoted"||no.kind!=="quoted"||
     !validLiteral(yes.value)||!validLiteral(no.value))return undefined;
  const operand=(token:typeof left):ConditionalOperand|undefined=>
    token.kind==="word"&&refs.has(token.value)?refs.get(token.value):literal(token);
  const a=operand(left),b=operand(right);
  if(!a||!b)return undefined;
  // Every nested expression must be an entire operand, not dead field code.
  const expected=[left.value,right.value].filter(v=>refs.has(v));
  if(expected.length!==refs.size||new Set(expected).size!==refs.size)return undefined;
  return {type:"IF_NESTED",left:a,right:b,operator:op.value as NestedConditionalField["operator"],
    whenTrue:yes.value,whenFalse:no.value};
}

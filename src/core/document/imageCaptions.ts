import {
  createEditorParagraphFromRuns,
  createEditorRun,
} from "@/core/editorState.js";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import {
  getDocumentSections,
  getParagraphLength,
  getRunFieldChar,
  getRunFieldInstruction,
} from "@/core/model.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";
import { compileFieldInstruction, type SequenceField } from "./fieldEvaluation.js";
import { resolveBodySequences, resolveOrderedSequences, sequenceOccurrenceKey } from "./sequenceFields.js";
import { formatPageNumber } from "@/core/format/pageNumberFormat.js";
import { cloneParagraph } from "./clone.js";

export const IMAGE_CAPTION_STYLE_ID = "Caption";
export const IMAGE_CAPTION_FIELD_IDENTIFIER = "Figure";
export const IMAGE_CAPTION_FIELD_INSTRUCTION = " SEQ Figure \\* ARABIC ";

function createFieldCharRun(kind: "begin" | "separate" | "end"): EditorTextRun {
  return {
    id: createEditorRun("").id,
    text: "",
    kind: "fieldChar",
    fieldChar: { kind },
  };
}

function createFieldInstructionRun(instruction: string): EditorTextRun {
  return {
    id: createEditorRun("").id,
    text: "",
    kind: "fieldInstruction",
    fieldInstruction: instruction,
  };
}

export function createImageCaptionParagraph(
  captionText: string,
  label: string,
  sequenceNumber: number,
): EditorParagraphNode {
  const paragraph = createEditorParagraphFromRuns([
    { text: `${label} ` },
    { text: String(sequenceNumber) },
    { text: captionText ? `: ${captionText}` : "" },
  ]);
  paragraph.style = { styleId: IMAGE_CAPTION_STYLE_ID, align: "center" };
  paragraph.runs = [
    paragraph.runs[0]!,
    createFieldCharRun("begin"),
    createFieldInstructionRun(IMAGE_CAPTION_FIELD_INSTRUCTION),
    createFieldCharRun("separate"),
    paragraph.runs[1]!,
    createFieldCharRun("end"),
    paragraph.runs[2]!,
  ];
  return paragraph;
}

export function isImageCaptionParagraph(
  paragraph: EditorParagraphNode | undefined,
): paragraph is EditorParagraphNode {
  if (!paragraph) {
    return false;
  }
  const styleId = paragraph.style?.styleId?.toLowerCase();
  if (styleId !== "caption") {
    return false;
  }
  return paragraph.runs.some((run): boolean => {
    const instruction = getRunFieldInstruction(run);
    return (
      instruction !== undefined &&
      new RegExp(`\\bSEQ\\s+${IMAGE_CAPTION_FIELD_IDENTIFIER}\\b`, "i").test(
        instruction,
      )
    );
  });
}

export function getImageCaptionText(
  paragraph: EditorParagraphNode | undefined,
): string {
  if (!isImageCaptionParagraph(paragraph)) {
    return "";
  }
  let afterField = false;
  let value = "";
  for (const run of paragraph.runs) {
    if (afterField) {
      value += run.text;
      continue;
    }
    if (getRunFieldChar(run)?.kind === "end") {
      afterField = true;
    }
  }
  return value.replace(/^[:\-\s]+/, "");
}


interface FigureField {
  field:SequenceField;
  begin:number;
  end:number;
  result:number;
  locked:boolean;
}
/** A complete single Figure field is required before changing its surfaces. */
function figureField(p:EditorParagraphNode):FigureField|undefined{
  if(!isImageCaptionParagraph(p)||p.sdtWrappers?.length||p.numberingRevision||
     p.runs.some(r=>r.revision||r.revisionRangeMarker||r.sdtWrappers?.length))return undefined;
  const graph=buildFieldStoryGraph([p]);
  if(graph.diagnostics.length||graph.spans.length!==1)return undefined;
  const s=graph.spans[0]!;
  if(s.parentIndex!==null||!s.end||!s.separator||
     s.code.some(part=>part.kind!=="instruction")||s.result.length!==1||
     s.result[0]?.kind!=="run")return undefined;
  const field=compileFieldInstruction(s.code.map(part=>part.kind==="instruction"?part.raw:"").join(""));
  if(field?.type!=="SEQ"||field.identifier!=="figure")return undefined;
  const result=s.result[0].point.runIndex;
  if(p.runs[result]?.kind!=="text"||result<=s.separator.runIndex||result>=s.end.runIndex)return undefined;
  return {field,begin:s.begin.runIndex,end:s.end.runIndex,result,locked:!!s.beginMarker.fieldLock};
}
/** Edit the label and caption only; preserve the original instruction,
 * marker flags, cached field result, OOXML source and all field run IDs. */
export function updateImageCaptionParagraph(
  p:EditorParagraphNode,captionText:string,label:string,
):EditorParagraphNode{
  const info=figureField(p);
  if(!info)return p;
  const before=p.runs.slice(0,info.begin);
  const after=p.runs.slice(info.end+1);
  const safe=(rs:EditorTextRun[])=>rs.every(r=>r.kind==="text"&&!r.revision&&!r.revisionRangeMarker&&!r.sdtWrappers?.length);
  if(!safe(before)||!safe(after))return p;
  const prefix=label+" ",suffix=captionText?": "+captionText:"";
  if(before.map(r=>r.text).join("")===prefix&&after.map(r=>r.text).join("")===suffix)return p;
  return {...p,runs:[
    {...(before[0]??createEditorRun("")),text:prefix},
    ...p.runs.slice(info.begin,info.end+1),
    {...(after[0]??createEditorRun("")),text:suffix},
  ]};
}
function projectCaptionCache(p:EditorParagraphNode, values:ReadonlyMap<string,number>):EditorParagraphNode{
  const info=figureField(p);
  if(!info||info.locked)return p;
  const number=values.get(sequenceOccurrenceKey(p.id,info.result));
  if(number===undefined)return p;
  const text=formatPageNumber(number,info.field.format);
  if(p.runs[info.result]!.text===text)return p;
  return {...p,runs:p.runs.map((run,i)=>i===info.result?{...run,text}:run)};
}
/** Shared SEQ computation includes non-caption Figure occurrences. */
export function renumberImageCaptionParagraphs(
  paragraphs:EditorParagraphNode[],
  styles?:EditorDocument["styles"],
):EditorParagraphNode[]{
  const values=resolveOrderedSequences(paragraphs,styles);
  return paragraphs.map(p=>cloneParagraph(projectCaptionCache(p,values)));
}
export function renumberImageCaptionsInDocument(document:EditorDocument):EditorDocument{
  const values=resolveBodySequences(document);
  if(!values.size)return document;
  let changed=false;
  const visit=(blocks:readonly EditorBlockNode[]):EditorBlockNode[]=>blocks.map(block=>{
    if(block.type==="paragraph"){
      const next=projectCaptionCache(block,values);
      if(next!==block)changed=true;
      return next;
    }
    let tableChanged=false;
    const rows=block.rows.map(row=>{
      let rowChanged=false;
      const cells=row.cells.map(cell=>{
        const blocks=visit(cell.blocks);
        if(blocks.some((b,i)=>b!==cell.blocks[i])){
          rowChanged=true;
          return {...cell,blocks};
        }
        return cell;
      });
      if(rowChanged){tableChanged=true;return {...row,cells};}
      return row;
    });
    return tableChanged?{...block,rows}:block;
  });
  const sections=getDocumentSections(document).map(section=>{
    const blocks=visit(section.blocks);
    return blocks.some((b,i)=>b!==section.blocks[i])?{...section,blocks}:section;
  });
  return changed?{...document,sections}:document;
}
export function getCaptionSelectionOffset(p:EditorParagraphNode):number{
  return getParagraphLength(p);
}
export function cloneParagraphsWithRenumberedCaptions(paragraphs:EditorParagraphNode[]):EditorParagraphNode[]{
  return renumberImageCaptionParagraphs(paragraphs);
}

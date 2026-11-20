import {
  createEditorParagraphFromRuns,
  createEditorRun,
} from "@/core/editorState.js";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorSection,
  EditorTextRun,
} from "@/core/model.js";
import {
  getDocumentSections,
  getParagraphLength,
  getRunFieldChar,
  getRunFieldInstruction,
} from "@/core/model.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import { assertNever } from "@/core/assertNever.js";
import { cloneBlocks, cloneParagraph, cloneParagraphs } from "./clone.js";

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

export function updateImageCaptionParagraph(
  paragraph: EditorParagraphNode,
  captionText: string,
  label: string,
): EditorParagraphNode {
  const currentNumber =
    paragraph.runs.find((run): boolean => /^\d+$/.test(run.text))?.text ?? "1";
  const next = createImageCaptionParagraph(
    captionText,
    label,
    Number.parseInt(currentNumber, 10) || 1,
  );
  next.id = paragraph.id;
  return next;
}

function canonicalFigureCaption(p:EditorParagraphNode):boolean{
  if(!isImageCaptionParagraph(p))return false;
  const graph=buildFieldStoryGraph([p]);
  if(graph.diagnostics.length||graph.spans.length!==1)return false;
  const s=graph.spans[0]!;
  return !!s.end&&!!s.separator&&!s.beginMarker.fieldLock&&
    s.code.length===1&&s.code[0]?.kind==="instruction"&&
    /^\s*SEQ\s+Figure\s+\\\*\s+ARABIC\s*$/i.test(s.code[0].raw)&&
    s.result.length===1&&s.result[0]?.kind==="run"&&
    p.runs[s.result[0].point.runIndex]?.kind==="text"&&
    !p.runs.some(r=>r.revision||r.revisionRangeMarker||r.sdtWrappers?.length);
}
function hasNoncanonicalFigure(paragraphs:EditorParagraphNode[]):boolean{
  const graph=buildFieldStoryGraph(paragraphs);
  if(graph.diagnostics.length)return true;
  return graph.spans.some(s=>{
    const parsed=parseFieldInstruction(s.code.map(p=>p.kind==="instruction"?p.raw:"").join(""));
    return parsed.command==="SEQ"&&parsed.tokens[1]?.value.toLowerCase()==="figure"&&
      !canonicalFigureCaption(paragraphs[s.begin.paragraphIndex]!);
  });
}
function renumberCaptionParagraph(
  paragraph: EditorParagraphNode,
  sequenceNumber: number,
): EditorParagraphNode {
  if (!canonicalFigureCaption(paragraph)) {
    return cloneParagraph(paragraph);
  }

  let insideSeqResult = false;
  let changed = false;
  const nextRuns = paragraph.runs.map((run): EditorTextRun => {
    if (run.kind === "fieldChar" && run.fieldChar.kind === "separate") {
      insideSeqResult = true;
      return { ...run, fieldChar: { ...run.fieldChar } };
    }
    if (run.kind === "fieldChar" && run.fieldChar.kind === "end") {
      insideSeqResult = false;
      return { ...run, fieldChar: { ...run.fieldChar } };
    }
    if (insideSeqResult && run.text !== "") {
      if (run.text === String(sequenceNumber)) {
        return { ...run };
      }
      changed = true;
      return { ...run, text: String(sequenceNumber) };
    }
    return { ...run };
  });

  if (!changed) {
    return cloneParagraph(paragraph);
  }

  return {
    ...cloneParagraph(paragraph),
    runs: nextRuns,
  };
}

export function renumberImageCaptionParagraphs(
  paragraphs: EditorParagraphNode[],
): EditorParagraphNode[] {
  if(hasNoncanonicalFigure(paragraphs))return cloneParagraphs(paragraphs);
  let nextSequence = 1;
  return paragraphs.map((paragraph): EditorParagraphNode => {
    if (!isImageCaptionParagraph(paragraph)) {
      return cloneParagraph(paragraph);
    }
    return renumberCaptionParagraph(paragraph, nextSequence++);
  });
}

function renumberBlocks(
  blocks: EditorBlockNode[],
  sequence: { next: number },
): EditorBlockNode[] {
  return blocks.map((block) => {
    switch (block.type) {
      case "paragraph":
        return isImageCaptionParagraph(block)
          ? renumberCaptionParagraph(block, sequence.next++)
          : cloneParagraph(block);
      case "table":
        return {
          ...block,
          rows: block.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => ({
              ...cell,
              blocks: renumberBlocks(cell.blocks, sequence),
            })),
          })),
        };
      default:
        return assertNever(block, "block");
    }
  });
}

export function renumberImageCaptionsInDocument(
  document: EditorDocument,
): EditorDocument {
  const body:EditorParagraphNode[]=[];
  const visit=(blocks:EditorBlockNode[]):void=>{
    for(const b of blocks)if(b.type==="paragraph")body.push(b);
    else for(const row of b.rows)for(const cell of row.cells)visit(cell.blocks);
  };
  for(const section of getDocumentSections(document))visit(section.blocks);
  if(hasNoncanonicalFigure(body))return document;
  const sequence = { next: 1 };
  const sections = getDocumentSections(document).map(
    (section): EditorSection => ({
      ...section,
      blocks: renumberBlocks(section.blocks, sequence),
      header: section.header ? cloneBlocks(section.header) : undefined,
      footer: section.footer ? cloneBlocks(section.footer) : undefined,
    }),
  );

  return {
    ...document,
    sections,
  };
}

export function getCaptionSelectionOffset(
  paragraph: EditorParagraphNode,
): number {
  return getParagraphLength(paragraph);
}

export function cloneParagraphsWithRenumberedCaptions(
  paragraphs: EditorParagraphNode[],
): EditorParagraphNode[] {
  return renumberImageCaptionParagraphs(cloneParagraphs(paragraphs));
}

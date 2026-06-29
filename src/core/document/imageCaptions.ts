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

function renumberCaptionParagraph(
  paragraph: EditorParagraphNode,
  sequenceNumber: number,
): EditorParagraphNode {
  if (!isImageCaptionParagraph(paragraph)) {
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
              blocks: renumberBlocks(
                cell.blocks,
                sequence,
              ) as EditorParagraphNode[],
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

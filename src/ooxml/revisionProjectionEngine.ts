import type { EditorDocument, EditorState, EditorBlockNode, EditorParagraphNode, EditorTableNode } from "@/core/model.js";
import { acceptRevisionsInSelection, rejectRevisionsInSelection, acceptRevision, rejectRevision } from "@/core/commands/history.js";

export type RevisionProjectionMode = "show-markup" | "final" | "original";

export function projectParagraphForMode(
  paragraph: EditorParagraphNode,
  mode: RevisionProjectionMode
): EditorParagraphNode | null {
  if (mode === "show-markup") return paragraph;

  if (mode === "final") {
    const runs = paragraph.runs.filter((run) => run.revision?.type !== "delete");
    if (runs.length === 0) return null;
    return { ...paragraph, runs };
  }

  if (mode === "original") {
    const runs = paragraph.runs.filter((run) => run.revision?.type !== "insert");
    if (runs.length === 0) return null;
    return { ...paragraph, runs };
  }

  return paragraph;
}

export function projectBlocksForMode(
  blocks: EditorBlockNode[],
  mode: RevisionProjectionMode
): EditorBlockNode[] {
  if (mode === "show-markup") return blocks;

  const result: EditorBlockNode[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph") {
      const proj = projectParagraphForMode(block, mode);
      if (proj) result.push(proj);
    } else if (block.type === "table") {
      const rows = block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: projectBlocksForMode(cell.blocks, mode),
        })),
      }));
      result.push({ ...block, rows });
    }
  }
  return result;
}

export function projectDocumentForMode(
  document: EditorDocument,
  mode: RevisionProjectionMode
): EditorDocument {
  if (mode === "show-markup") return document;

  const sections = (document.sections ?? []).map((section) => ({
    ...section,
    blocks: projectBlocksForMode(section.blocks, mode),
    header: section.header ? projectBlocksForMode(section.header, mode) : undefined,
    footer: section.footer ? projectBlocksForMode(section.footer, mode) : undefined,
  }));

  return {
    ...document,
    sections,
  };
}

import { getParagraphs, getParagraphLength } from "@/core/model.js";

function selectAllParagraphs(state: EditorState): EditorState {
  const paragraphs = getParagraphs(state);
  if (paragraphs.length === 0) return state;
  const first = paragraphs[0]!;
  const last = paragraphs[paragraphs.length - 1]!;
  return {
    ...state,
    selection: {
      anchor: { paragraphId: first.id, runId: first.runs[0]?.id ?? "", offset: 0 },
      focus: { paragraphId: last.id, runId: last.runs[last.runs.length - 1]?.id ?? "", offset: getParagraphLength(last) },
    },
  };
}

export function acceptAllDocumentRevisions(state: EditorState): EditorState {
  return acceptRevisionsInSelection(selectAllParagraphs(state));
}

export function rejectAllDocumentRevisions(state: EditorState): EditorState {
  return rejectRevisionsInSelection(selectAllParagraphs(state));
}

import type {
  EditorDocument,
  EditorLayoutDocument,
  EditorParagraphNode,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSections,
  getParagraphLength,
  positionToParagraphOffset,
} from "@/core/model.js";
import { createEditorParagraph, createEditorRun } from "@/core/editorState.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import { buildFieldStoryGraph } from "@/core/document/fieldStoryGraph.js";
import { parseTocInstruction } from "@/core/document/tocFields.js";
import { collectCaptionOccurrences } from "@/core/document/captionEntries.js";
import {
  findQualifiedFigureTocRegion,
  refreshTableOfFigures,
} from "@/core/document/tableOfFigures.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";

export interface InsertTableOfFiguresOptions {
  identifier: string;
  unlabeled?: boolean;
  entryPageSeparator?: string;
}
const instruction = (text: string): EditorTextRun => ({
  ...createEditorRun(""),
  kind: "fieldInstruction",
  fieldInstruction: text,
});
const control = (kind: "begin" | "separate" | "end"): EditorTextRun => ({
  ...createEditorRun(""),
  kind: "fieldChar",
  fieldChar: { kind },
});

function safeContext(state: EditorState) {
  if (
    getActiveZone(state) !== "main" ||
    state.trackChangesEnabled ||
    !isSelectionCollapsed(state.selection)
  )
    return undefined;
  const sections = getDocumentSections(state.document),
    index = getActiveSectionIndex(state),
    section = sections[index];
  if (!section || section.blocks.some((b) => b.type !== "paragraph"))
    return undefined;
  const paragraphs = section.blocks as EditorParagraphNode[];
  const at = paragraphs.findIndex(
      (p) => p.id === state.selection.focus.paragraphId,
    ),
    p = paragraphs[at];
  if (
    !p ||
    positionToParagraphOffset(p, state.selection.focus) !==
      getParagraphLength(p) ||
    p.sdtWrappers?.length ||
    p.list ||
    p.numberingRevision ||
    p.dropCap ||
    p.style?.propertyRevision ||
    p.runs.some(
      (r) =>
        r.revision ||
        r.revisionRangeMarker ||
        r.sdtWrappers?.length ||
        r.styles?.propertyRevision,
    )
  )
    return undefined;
  const graph = buildFieldStoryGraph(paragraphs);
  if (graph.diagnostics.length) return undefined;
  return { sections, index, section, paragraphs, at, graph };
}
function replace(
  state: EditorState,
  c: NonNullable<ReturnType<typeof safeContext>>,
  blocks: EditorParagraphNode[],
): EditorState {
  return {
    ...state,
    document: {
      ...state.document,
      sections: c.sections.map((s, i) =>
        i === c.index ? { ...s, blocks } : s,
      ),
    },
  };
}

export function canInsertTableOfFigures(state: EditorState): boolean {
  const c = safeContext(state);
  if (
    !c ||
    Object.keys(state.document.bookmarks?.items ?? {}).length ||
    Object.keys(state.document.comments?.items ?? {}).length ||
    (c.section.pageSettings.columns?.count ?? 1) > 1
  )
    return false;
  if (
    c.graph.spans.some((f) => {
      const raw = f.code
        .map((p) => (p.kind === "instruction" ? p.raw : ""))
        .join("");
      const settings = parseTocInstruction(raw);
      return (
        settings?.captionIdentifier !== undefined ||
        settings?.unlabeledIdentifier !== undefined
      );
    })
  )
    return false;
  for (const section of c.sections) {
    if (section.blocks.some((b) => b.type !== "paragraph")) return false;
    const graph = buildFieldStoryGraph(section.blocks as EditorParagraphNode[]);
    if (
      graph.diagnostics.length ||
      graph.spans.some((f) => {
        const raw = f.code
          .map((p) => (p.kind === "instruction" ? p.raw : ""))
          .join("");
        const settings = parseTocInstruction(raw);
        return (
          settings?.captionIdentifier !== undefined ||
          settings?.unlabeledIdentifier !== undefined
        );
      })
    )
      return false;
  }
  return true;
}

export function insertTableOfFigures(
  state: EditorState,
  options: InsertTableOfFiguresOptions,
  paginate: (
    doc: EditorDocument,
  ) => EditorLayoutDocument = projectDocumentLayout,
): EditorState {
  const c = safeContext(state);
  if (
    !c ||
    !canInsertTableOfFigures(state) ||
    !options.identifier ||
    !/^[A-Za-z_][A-Za-z0-9_ ]{0,63}$/.test(options.identifier)
  )
    return state;
  const raw = options.unlabeled
    ? ` TOC \\a ${options.identifier} `
    : ` TOC \\c "${options.identifier}" `;
  if (!parseTocInstruction(raw)) return state;
  const begin = createEditorParagraph("");
  begin.runs = [control("begin"), instruction(raw), control("separate")];
  const end = createEditorParagraph("");
  end.runs = [control("end")];
  const candidate = replace(state, c, [
    ...c.paragraphs.slice(0, c.at + 1),
    begin,
    end,
    ...c.paragraphs.slice(c.at + 1),
  ]);
  const result = refreshTableOfFigures(candidate, paginate);
  return result.status === "updated" ? result.state : state;
}

export function canUpdateTableOfFigures(state: EditorState): boolean {
  if (getActiveZone(state) !== "main" || state.trackChangesEnabled)
    return false;
  const section = getDocumentSections(state.document)[
    getActiveSectionIndex(state)
  ];
  return !!section && !!findQualifiedFigureTocRegion(section.blocks);
}

export function updateTableOfFigures(state: EditorState): EditorState {
  const result = refreshTableOfFigures(state);
  return result.status === "updated" ? result.state : state;
}

/** List identifiers available for a Ribbon picker (read-only, no pagination). */
export function listCaptionIdentifiers(state: EditorState): string[] {
  const found = new Set<string>();
  for (const identifier of ["Figure", "Table"]) {
    if (collectCaptionOccurrences(state.document, identifier)?.length)
      found.add(identifier);
  }
  return [...found];
}

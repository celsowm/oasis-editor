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
import { getEditorParagraphOoxmlSource } from "@/ooxml/word/sourceFragments.js";
import { buildFieldStoryGraph } from "@/core/document/fieldStoryGraph.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import {
  collectTaOccurrences,
  parseTaInstruction,
} from "@/core/document/toaEntries.js";
import { parseToaInstruction } from "@/core/document/toaPlan.js";
import {
  findQualifiedToaRegion,
  refreshTableOfAuthorities,
} from "@/core/document/toaRefresh.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";

export interface MarkAuthorityEntryOptions {
  long: string;
  short?: string;
  category?: string;
  boldPage?: boolean;
  italicPage?: boolean;
}
export interface InsertTableOfAuthoritiesOptions {
  locale: string;
  category: string;
  heading?: boolean;
  passim?: boolean;
}
const instruction = (text: string, hidden = false): EditorTextRun => ({
  ...createEditorRun(""),
  kind: "fieldInstruction",
  fieldInstruction: text,
  ...(hidden ? { styles: { hidden: true } } : {}),
});
const control = (
  kind: "begin" | "separate" | "end",
  hidden = false,
): EditorTextRun => ({
  ...createEditorRun(""),
  kind: "fieldChar",
  fieldChar: { kind },
  ...(hidden ? { styles: { hidden: true } } : {}),
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
  return { sections, index, section, paragraphs, at, p, graph };
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
const validText = (value: unknown): value is string =>
  typeof value === "string" &&
  !!value.trim() &&
  value.length <= 4096 &&
  !/[\r\n\t\\;"]/.test(value);
const validCategory = (value: unknown): value is string =>
  typeof value === "string" &&
  !!value &&
  value.length <= 32 &&
  !/\s|["\\]/.test(value);

export function canMarkAuthorityEntry(state: EditorState): boolean {
  const c = safeContext(state);
  if (
    !c ||
    getEditorParagraphOoxmlSource(c.p) ||
    c.p.runs.some(
      (r) => r.kind !== "text" || r.styles?.hidden || r.styles?.rtl,
    ) ||
    c.graph.spans.some(
      (f) =>
        f.begin.paragraphIndex <= c.at &&
        (f.end?.paragraphIndex ?? Infinity) >= c.at,
    )
  )
    return false;
  if (
    [
      ...Object.values(state.document.bookmarks?.items ?? {}),
      ...Object.values(state.document.comments?.items ?? {}),
    ].some(
      (b) => b.start?.paragraphId === c.p.id || b.end?.paragraphId === c.p.id,
    )
  )
    return false;
  return collectTaOccurrences(state.document) !== undefined;
}

/** Append a hidden TA marker at an explicit paragraph-end caret. */
export function markAuthorityEntry(
  state: EditorState,
  options: MarkAuthorityEntryOptions,
): EditorState {
  const c = safeContext(state);
  if (
    !c ||
    !canMarkAuthorityEntry(state) ||
    !validText(options.long) ||
    (options.short !== undefined && !validText(options.short)) ||
    (options.category !== undefined && !validCategory(options.category))
  )
    return state;
  const category = options.category ?? "1";
  const raw =
    ` TA \\l "${options.long}"` +
    (options.short ? ` \\s "${options.short}"` : "") +
    ` \\c ${category}` +
    (options.boldPage ? " \\b" : "") +
    (options.italicPage ? " \\i" : "") +
    " ";
  if (!parseTaInstruction(raw)) return state;
  const marked = {
    ...c.p,
    runs: [
      ...c.p.runs,
      control("begin", true),
      instruction(raw, true),
      control("end", true),
    ],
  };
  const next = replace(
    state,
    c,
    c.paragraphs.map((p, i) => (i === c.at ? marked : p)),
  );
  return collectTaOccurrences(next.document) ? next : state;
}

export function canInsertTableOfAuthorities(state: EditorState): boolean {
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
      return (
        parseFieldInstruction(raw).command === "TOA" ||
        /^\s*TOA(?=\s|\\|"|$)/i.test(raw)
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
        return (
          parseFieldInstruction(raw).command === "TOA" ||
          /^\s*TOA(?=\s|\\|"|$)/i.test(raw)
        );
      })
    )
      return false;
  }
  return !!collectTaOccurrences(state.document)?.length;
}

/** Insert one TOA after an explicit paragraph-end caret. */
export function insertTableOfAuthorities(
  state: EditorState,
  options: InsertTableOfAuthoritiesOptions,
  paginate: (
    doc: EditorDocument,
  ) => EditorLayoutDocument = projectDocumentLayout,
): EditorState {
  const c = safeContext(state);
  if (
    !c ||
    !canInsertTableOfAuthorities(state) ||
    !validCategory(options.category) ||
    !/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/.test(options.locale)
  )
    return state;
  const raw =
    ` TOA \\c "${options.category}"` +
    (options.heading ? " \\h" : "") +
    (options.passim ? " \\p" : "") +
    " ";
  if (!parseToaInstruction(raw)) return state;
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
  const result = refreshTableOfAuthorities(candidate, options.locale, paginate);
  return result.status === "updated" ? result.state : state;
}

export function updateTableOfAuthorities(
  state: EditorState,
  locale?: string,
): EditorState {
  const result = refreshTableOfAuthorities(state, locale);
  return result.status === "updated" ? result.state : state;
}

export function canUpdateTableOfAuthorities(state: EditorState): boolean {
  if (getActiveZone(state) !== "main" || state.trackChangesEnabled)
    return false;
  const section = getDocumentSections(state.document)[
    getActiveSectionIndex(state)
  ];
  return !!section && !!findQualifiedToaRegion(section.blocks);
}

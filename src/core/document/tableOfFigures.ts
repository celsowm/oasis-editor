import type {
  EditorBlockNode,
  EditorDocument,
  EditorLayoutDocument,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSections,
} from "@/core/model.js";
import { createEditorParagraphFromRuns } from "@/core/editorState.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";
import { createDocumentFieldContext } from "./fieldDocumentContext.js";
import { parseTocInstruction, type TocFieldSettings } from "./tocFields.js";
import {
  collectCaptionOccurrences,
  resolveCaptionPage,
  type CaptionOccurrence,
  type CaptionPage,
} from "./captionEntries.js";
import { resolveBodySequences } from "./sequenceFields.js";

interface Region {
  start: number;
  end: number;
  raw: string;
  settings: TocFieldSettings;
}
interface Fragment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}
interface FigureLine {
  fragments: Fragment[];
}
const MAX_PASSES = 6;
const safeParagraph = (p: EditorParagraphNode): boolean =>
  !p.sdtWrappers?.length &&
  !p.list &&
  !p.numberingRevision &&
  !p.dropCap &&
  !p.style?.propertyRevision &&
  p.runs.every(
    (r) =>
      !r.revision &&
      !r.revisionRangeMarker &&
      !r.sdtWrappers?.length &&
      !r.styles?.propertyRevision &&
      !r.styles?.hidden &&
      !r.styles?.rtl &&
      !r.styles?.link,
  );

/** A single complete caption TOC with separate marker paragraphs. */
export function findQualifiedFigureTocRegion(
  blocks: readonly EditorBlockNode[],
): Region | undefined {
  if (blocks.some((b) => b.type !== "paragraph")) return undefined;
  const paragraphs = blocks as readonly EditorParagraphNode[];
  const graph = buildFieldStoryGraph(paragraphs);
  if (graph.diagnostics.length) return undefined;
  const regions = graph.spans.filter((span) => {
    const raw = span.code
      .map((p) => (p.kind === "instruction" ? p.raw : ""))
      .join("");
    const settings = parseTocInstruction(raw);
    return (
      settings?.captionIdentifier !== undefined ||
      settings?.unlabeledIdentifier !== undefined
    );
  });
  if (regions.length !== 1) return undefined;
  const span = regions[0]!;
  const raw = span.code
    .map((p) => (p.kind === "instruction" ? p.raw : ""))
    .join("");
  const settings = parseTocInstruction(raw)!;
  if (
    span.parentIndex !== null ||
    !span.separator ||
    !span.end ||
    span.beginMarker.fieldLock ||
    span.beginMarker.dirty ||
    span.code.some((p) => p.kind !== "instruction") ||
    span.begin.paragraphIndex !== span.separator.paragraphIndex ||
    span.begin.paragraphIndex >= span.end.paragraphIndex
  )
    return undefined;
  const start = span.begin.paragraphIndex,
    end = span.end.paragraphIndex;
  const head = paragraphs[start]!,
    tail = paragraphs[end]!;
  if (
    !safeParagraph(head) ||
    !safeParagraph(tail) ||
    span.begin.runIndex !== 0 ||
    span.separator.runIndex !== head.runs.length - 1 ||
    span.end.runIndex !== 0 ||
    tail.runs.length !== 1 ||
    head.runs.some(
      (r) =>
        r.text.length ||
        (r.kind !== "fieldChar" && r.kind !== "fieldInstruction"),
    ) ||
    tail.runs[0]?.text.length !== 0
  )
    return undefined;
  const entries = paragraphs.slice(start + 1, end);
  if (
    !entries.every(
      (p) =>
        safeParagraph(p) &&
        p.runs.every((r) => r.kind === "text" && r.text.length <= 32768),
    ) ||
    span.result.some(
      (p) =>
        p.kind !== "run" ||
        p.point.paragraphIndex <= start ||
        p.point.paragraphIndex >= end,
    ) ||
    span.result.length !== entries.reduce((n, p) => n + p.runs.length, 0)
  )
    return undefined;
  return { start, end, raw, settings };
}

export interface FigureEntry {
  display: string;
  page?: CaptionPage;
}
export interface FigureTocPlan {
  settings: TocFieldSettings;
  entries: FigureEntry[];
}

export function buildFigureTocPlan(
  document: EditorDocument,
  layout: EditorLayoutDocument,
  raw: string,
): FigureTocPlan | undefined {
  const settings = parseTocInstruction(raw);
  if (
    !settings ||
    (settings.captionIdentifier === undefined &&
      settings.unlabeledIdentifier === undefined)
  )
    return undefined;
  const identifier =
    settings.captionIdentifier ?? settings.unlabeledIdentifier!;
  const occurrences = collectCaptionOccurrences(
    document,
    identifier,
    !!settings.unlabeledIdentifier,
  );
  if (!occurrences || occurrences.length > 2048) return undefined;
  const chapter = settings.chapterIdentifier
    ? resolveBodySequences(document).get(
        settings.chapterIdentifier.toLowerCase(),
      )
    : undefined;
  if (settings.chapterIdentifier && chapter === undefined) return undefined;
  const context = createDocumentFieldContext(document, layout);
  const entries: FigureEntry[] = [];
  for (const item of occurrences as CaptionOccurrence[]) {
    const page = settings.scopeBookmark
      ? undefined
      : resolveCaptionPage(document, layout, item, context);
    if (!settings.scopeBookmark && !page) return undefined;
    const display =
      chapter === undefined
        ? item.display
        : `${chapter}${settings.chapterSeparator ?? "-"}${item.display}`;
    if (display.length > 4096) return undefined;
    entries.push({ display, page });
  }
  return { settings, entries };
}

export function renderFigureTocPlan(
  plan: FigureTocPlan,
): FigureLine[] | undefined {
  if (!plan.entries.length) return undefined;
  const lines: FigureLine[] = [];
  const separator = plan.settings.entryPageSeparator ?? "\t";
  for (const entry of plan.entries) {
    const fragments: Fragment[] = [{ text: entry.display }];
    const omit = plan.settings.omitPages;
    const number = Number(entry.display.match(/\d+/)?.[0] ?? 0);
    const hidden = omit && number >= omit[0] && number <= omit[1];
    if (entry.page && !hidden)
      fragments.push({ text: separator }, { text: entry.page.label });
    if (fragments.some((f) => !f.text || f.text.length > 40000))
      return undefined;
    lines.push({ fragments });
  }
  return lines;
}

function normalized(
  fragments: readonly Fragment[],
): Array<{ text: string; bold: boolean; italic: boolean }> {
  const out: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  for (const f of fragments) {
    if (!f.text) continue;
    const last = out.at(-1);
    if (last && last.bold === !!f.bold && last.italic === !!f.italic)
      last.text += f.text;
    else out.push({ text: f.text, bold: !!f.bold, italic: !!f.italic });
  }
  return out;
}
const matches = (p: EditorBlockNode, line: FigureLine): boolean =>
  p.type === "paragraph" &&
  JSON.stringify(
    normalized(
      p.runs.map((r) => ({
        text: r.text,
        bold: r.styles?.bold,
        italic: r.styles?.italic,
      })),
    ),
  ) === JSON.stringify(normalized(line.fragments));
const makeLine = (line: FigureLine): EditorParagraphNode =>
  createEditorParagraphFromRuns(
    normalized(line.fragments).map((f) => ({ text: f.text })),
  );

export interface FigureTocRefreshResult {
  state: EditorState;
  status:
    "updated" | "unchanged" | "unsupported" | "unresolved" | "nonconvergent";
  passes: number;
  updatedEntries: number;
  layout?: EditorLayoutDocument;
}

export function refreshTableOfFigures(
  original: EditorState,
  paginate: (
    document: EditorDocument,
  ) => EditorLayoutDocument = projectDocumentLayout,
  maxPasses = MAX_PASSES,
): FigureTocRefreshResult {
  let initialLayout: EditorLayoutDocument | undefined;
  const fail = (
    status: FigureTocRefreshResult["status"],
    passes: number,
  ): FigureTocRefreshResult => ({
    state: original,
    status,
    passes,
    updatedEntries: 0,
    layout: initialLayout,
  });
  if (
    getActiveZone(original) !== "main" ||
    original.trackChangesEnabled ||
    !Number.isSafeInteger(maxPasses) ||
    maxPasses < 1 ||
    maxPasses > MAX_PASSES
  )
    return fail("unsupported", 0);
  const sectionIndex = getActiveSectionIndex(original);
  const section = getDocumentSections(original.document)[sectionIndex];
  if (!section) return fail("unsupported", 0);
  const region = findQualifiedFigureTocRegion(section.blocks);
  if (!region) return fail("unsupported", 0);
  const beginId = section.blocks[region.start]!.id,
    endId = section.blocks[region.end]!.id;
  let current = original;
  const seen = new Set<string>();
  for (let pass = 1; pass <= maxPasses; pass++) {
    let layout: EditorLayoutDocument;
    try {
      layout = paginate(current.document);
    } catch {
      return fail("unsupported", pass);
    }
    initialLayout ??= layout;
    const sections = getDocumentSections(current.document),
      activeSection = sections[sectionIndex];
    const active =
      activeSection && findQualifiedFigureTocRegion(activeSection.blocks);
    if (
      !activeSection ||
      !active ||
      active.raw !== region.raw ||
      activeSection.blocks[active.start]!.id !== beginId ||
      activeSection.blocks[active.end]!.id !== endId
    )
      return fail("unsupported", pass);
    const plan = buildFigureTocPlan(current.document, layout, active.raw);
    if (!plan) return fail("unresolved", pass);
    const lines = renderFigureTocPlan(plan);
    if (!lines) return fail("unsupported", pass);
    const cache = activeSection.blocks.slice(active.start + 1, active.end);
    if (
      cache.length === lines.length &&
      cache.every((p, i) => matches(p, lines[i]!))
    ) {
      return {
        state: current,
        status: current === original ? "unchanged" : "updated",
        passes: pass,
        updatedEntries: current === original ? 0 : lines.length,
        layout,
      };
    }
    const signature = JSON.stringify([
      lines,
      layout.pages.map((p) => [p.index, p.sectionIndex]),
    ]);
    if (seen.has(signature)) return fail("nonconvergent", pass);
    seen.add(signature);
    const blocks = [
      ...activeSection.blocks.slice(0, active.start + 1),
      ...lines.map(makeLine),
      ...activeSection.blocks.slice(active.end),
    ];
    current = {
      ...current,
      document: {
        ...current.document,
        sections: sections.map((s, i) =>
          i === sectionIndex ? { ...s, blocks } : s,
        ),
      },
      selection: original.selection,
    };
  }
  return fail("nonconvergent", maxPasses);
}

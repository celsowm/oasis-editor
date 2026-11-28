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
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";
import { buildToaPlan, parseToaInstruction } from "./toaPlan.js";
import type { ToaPlan } from "./toaPlan.js";

interface ToaRegion {
  start: number;
  end: number;
  raw: string;
}
interface Fragment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}
interface ToaLine {
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

/** One complete flat TOA with separate marker paragraphs only. */
export function findQualifiedToaRegion(
  blocks: readonly EditorBlockNode[],
): ToaRegion | undefined {
  if (blocks.some((b) => b.type !== "paragraph")) return undefined;
  const paragraphs = blocks as readonly EditorParagraphNode[];
  const graph = buildFieldStoryGraph(paragraphs);
  if (graph.diagnostics.length) return undefined;
  const toas = graph.spans.filter((span) => {
    const raw = span.code
      .map((p) => (p.kind === "instruction" ? p.raw : ""))
      .join("");
    return (
      parseFieldInstruction(raw).command === "TOA" ||
      /^\s*TOA(?=\s|\\|"|$)/i.test(raw)
    );
  });
  if (toas.length !== 1) return undefined;
  const span = toas[0]!;
  const raw = span.code
    .map((p) => (p.kind === "instruction" ? p.raw : ""))
    .join("");
  if (
    !parseToaInstruction(raw) ||
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
  return { start, end, raw };
}

export function renderToaPlan(plan: ToaPlan): ToaLine[] | undefined {
  if (plan.entries.length > 2048) return undefined;
  const { settings } = plan;
  const lines: ToaLine[] = [];
  if (settings.includeHeading)
    lines.push({ fragments: [{ text: plan.category }] });
  for (const entry of plan.entries) {
    const fragments: Fragment[] = [];
    if (entry.prefix) fragments.push({ text: entry.prefix });
    fragments.push({ text: entry.label });
    const references: Fragment[] =
      settings.passim && entry.pages.length >= 5
        ? [{ text: "passim" }]
        : entry.pages.map((page, i) => ({
            text: `${i ? settings.pageSeparator : ""}${page.label}`,
            bold: entry.bold,
            italic: entry.italic,
          }));
    for (const pages of entry.ranges ?? []) {
      const first = pages[0],
        last = pages.at(-1);
      if (
        !first ||
        !last ||
        pages.some((p) => p.sectionIndex !== first.sectionIndex) ||
        (first !== last && first.label === last.label)
      )
        return undefined;
      references.push({
        text: settings.pageSeparator,
        bold: entry.bold,
        italic: entry.italic,
      });
      references.push({
        text:
          first === last
            ? first.label
            : `${first.label}${settings.rangeSeparator}${last.label}`,
        bold: entry.bold,
        italic: entry.italic,
      });
    }
    if (references.length) {
      fragments.push({ text: settings.entrySeparator }, ...references);
    }
    if (fragments.some((f) => !f.text || f.text.length > 40000))
      return undefined;
    lines.push({ fragments });
  }
  return lines.length ? lines : undefined;
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
const matches = (p: EditorBlockNode, line: ToaLine): boolean =>
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
const makeLine = (line: ToaLine): EditorParagraphNode =>
  createEditorParagraphFromRuns(
    normalized(line.fragments).map((f) => ({
      text: f.text,
      ...(f.bold || f.italic
        ? {
            styles: {
              ...(f.bold ? { bold: true } : {}),
              ...(f.italic ? { italic: true } : {}),
            },
          }
        : {}),
    })),
  );

export interface ToaRefreshResult {
  state: EditorState;
  status:
    "updated" | "unchanged" | "unsupported" | "unresolved" | "nonconvergent";
  passes: number;
  updatedEntries: number;
  layout?: EditorLayoutDocument;
}

/** Bounded, transactional TOA cache regeneration. No mutation is published
 * until a fixed point is reached; every refusal returns the original state. */
export function refreshTableOfAuthorities(
  original: EditorState,
  locale?: string,
  paginate: (
    document: EditorDocument,
  ) => EditorLayoutDocument = projectDocumentLayout,
  maxPasses = MAX_PASSES,
): ToaRefreshResult {
  let initialLayout: EditorLayoutDocument | undefined;
  const fail = (
    status: ToaRefreshResult["status"],
    passes: number,
  ): ToaRefreshResult => ({
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
  const region = findQualifiedToaRegion(section.blocks);
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
      activeSection && findQualifiedToaRegion(activeSection.blocks);
    if (
      !activeSection ||
      !active ||
      active.raw !== region.raw ||
      activeSection.blocks[active.start]!.id !== beginId ||
      activeSection.blocks[active.end]!.id !== endId
    )
      return fail("unsupported", pass);
    const plan = buildToaPlan(current.document, layout, active.raw, locale);
    if (!plan) return fail("unresolved", pass);
    const lines = renderToaPlan(plan);
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

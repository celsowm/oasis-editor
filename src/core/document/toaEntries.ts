import type {
  EditorDocument,
  EditorLayoutDocument,
  EditorParagraphNode,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";
import { createDocumentFieldContext } from "./fieldDocumentContext.js";
import { formatSectionPageLabel } from "@/core/format/pageNumberFormat.js";

/** Bounded TA (table-of-authorities entry) compiler. TA is hidden marker text:
 * no separator, no result and no nested field are accepted. */
export interface TaInstruction {
  long: string;
  short?: string;
  category: string;
  boldPage: boolean;
  italicPage: boolean;
  bookmark?: string;
}
export interface TaOccurrence extends TaInstruction {
  sectionIndex: number;
  paragraphId: string;
  runId: string;
  offset: number;
  raw: string;
}
export interface ToaPage {
  physicalPageIndex: number;
  label: string;
}

const validText = (value: string, max: number): boolean =>
  value.length > 0 &&
  value.length <= max &&
  !!value.trim() &&
  ![...value].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127);

export function parseTaInstruction(raw: string): TaInstruction | undefined {
  const parsed = parseFieldInstruction(raw);
  if (parsed.error || parsed.command !== "TA") return undefined;
  const args = parsed.tokens.slice(1);
  if (!args.length) return undefined;
  let long: string | undefined,
    short: string | undefined,
    category = "1";
  let boldPage = false,
    italicPage = false,
    bookmark: string | undefined;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!;
    if (token.kind !== "switch") return undefined;
    const sw = token.value.toLowerCase();
    if (seen.has(sw)) return undefined;
    seen.add(sw);
    if (sw === "b") {
      boldPage = true;
      continue;
    }
    if (sw === "i") {
      italicPage = true;
      continue;
    }
    if (sw !== "l" && sw !== "s" && sw !== "c" && sw !== "r") return undefined;
    const value = args[++i];
    if (!value || value.kind === "switch") return undefined;
    if (sw === "l" || sw === "s") {
      if (value.kind !== "quoted" || !validText(value.value, 4096))
        return undefined;
      if (sw === "l") long = value.value;
      else short = value.value;
    } else if (sw === "c") {
      if (!validText(value.value, 32) || /\s/.test(value.value))
        return undefined;
      category = value.value;
    } else {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(value.value)) return undefined;
      bookmark = value.value;
    }
  }
  if (!long) return undefined;
  return {
    long,
    ...(short ? { short } : {}),
    category,
    boldPage,
    italicPage,
    ...(bookmark ? { bookmark } : {}),
  };
}

/** Complete inventory of hidden TA markers in the top-level main story.
 * Malformed markers refuse the whole inventory rather than dropping entries. */
export function collectTaOccurrences(
  document: EditorDocument,
): TaOccurrence[] | undefined {
  const result: TaOccurrence[] = [];
  const seenIds = new Set<string>();
  for (const [sectionIndex, section] of getDocumentSections(
    document,
  ).entries()) {
    const paragraphs: EditorParagraphNode[] = [];
    for (const block of section.blocks) {
      if (
        block.type !== "paragraph" ||
        seenIds.has(block.id) ||
        block.runs.some((r) => r.kind === "textBox" || r.kind === "opaque")
      )
        return undefined;
      seenIds.add(block.id);
      paragraphs.push(block);
    }
    const graph = buildFieldStoryGraph(paragraphs);
    if (graph.diagnostics.length) return undefined;
    for (const span of graph.spans) {
      const raw = span.code
        .map((part) => (part.kind === "instruction" ? part.raw : ""))
        .join("");
      const parsed = parseFieldInstruction(raw);
      if (parsed.command !== "TA" && !/^\s*TA(?=\s|\\|"|$)/i.test(raw))
        continue;
      const entry = parseTaInstruction(raw);
      if (
        !entry ||
        span.parentIndex !== null ||
        !span.end ||
        span.separator ||
        span.begin.paragraphIndex !== span.end.paragraphIndex ||
        span.beginMarker.fieldLock ||
        span.beginMarker.dirty ||
        span.code.some((part) => part.kind !== "instruction") ||
        span.result.length
      )
        return undefined;
      const p = paragraphs[span.begin.paragraphIndex]!;
      if (
        p.sdtWrappers?.length ||
        p.numberingRevision ||
        p.dropCap ||
        new Set(p.runs.map((r) => r.id)).size !== p.runs.length ||
        p.runs
          .slice(span.begin.runIndex, span.end.runIndex + 1)
          .some(
            (r) =>
              r.text.length ||
              r.revision ||
              r.revisionRangeMarker ||
              r.sdtWrappers?.length ||
              r.styles?.link ||
              (r.kind !== "fieldChar" && r.kind !== "fieldInstruction"),
          )
      )
        return undefined;
      result.push({
        ...entry,
        sectionIndex,
        paragraphId: p.id,
        runId: span.begin.runId,
        offset: span.begin.offset,
        raw,
      });
      if (result.length > 4096) return undefined;
    }
  }
  return result;
}

export function resolveTaPointPage(
  document: EditorDocument,
  layout: EditorLayoutDocument,
  entry: TaOccurrence,
  context = createDocumentFieldContext(document, layout),
): ToaPage | undefined {
  if (entry.bookmark) return undefined;
  const physicalPageIndex = context.pageIndexAt(
    entry.paragraphId,
    entry.offset,
  );
  if (physicalPageIndex === undefined) return undefined;
  const facts = context.forPage(physicalPageIndex);
  if (
    facts.sectionNumber !== entry.sectionIndex + 1 ||
    facts.pageNumber === undefined
  )
    return undefined;
  const section = getDocumentSections(document)[entry.sectionIndex];
  if (!section) return undefined;
  const label = formatSectionPageLabel(
    facts.pageNumber,
    section.pageNumbering?.format,
  );
  return label === undefined
    ? undefined
    : { physicalPageIndex, label: String(label) };
}

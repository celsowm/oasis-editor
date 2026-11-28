import type {
  EditorDocument,
  EditorLayoutDocument,
  EditorParagraphNode,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";
import { compileFieldInstruction } from "./fieldEvaluation.js";
import {
  resolveBodySequences,
  sequenceOccurrenceKey,
} from "./sequenceFields.js";
import { createDocumentFieldContext } from "./fieldDocumentContext.js";
import { formatSectionPageLabel } from "@/core/format/pageNumberFormat.js";

/** Caption source for `TOC \c "Figure"` / `\a Table`: a complete, single SEQ
 * field in a plain top-level paragraph. Broken or nested fields refuse the
 * inventory instead of silently losing an entry. */
export interface CaptionOccurrence {
  identifier: string;
  number: number;
  display: string;
  paragraphId: string;
  offset: number;
  sectionIndex: number;
}
export interface CaptionPage {
  physicalPageIndex: number;
  label: string;
}

export function collectCaptionOccurrences(
  document: EditorDocument,
  identifier: string,
  unlabeled = false,
): CaptionOccurrence[] | undefined {
  if (
    !identifier ||
    identifier.length > 64 ||
    !/^[A-Za-z_][A-Za-z0-9_ ]*$/.test(identifier)
  )
    return undefined;
  const values = resolveBodySequences(document);
  const result: CaptionOccurrence[] = [];
  for (const [sectionIndex, section] of getDocumentSections(
    document,
  ).entries()) {
    const paragraphs: EditorParagraphNode[] = [];
    for (const block of section.blocks) {
      if (block.type !== "paragraph") return undefined;
      paragraphs.push(block);
    }
    // A TOC field legitimately spans paragraphs: qualify the whole story,
    // never a single paragraph in isolation.
    const graph = buildFieldStoryGraph(paragraphs);
    if (graph.diagnostics.length) return undefined;
    for (const span of graph.spans) {
      const raw = span.code
        .map((part) => (part.kind === "instruction" ? part.raw : ""))
        .join("");
      const compiled = compileFieldInstruction(raw);
      if (
        compiled?.type !== "SEQ" ||
        compiled.identifier !== identifier.toLowerCase()
      )
        continue;
      if (
        span.parentIndex !== null ||
        !span.end ||
        !span.separator ||
        span.code.some((part) => part.kind !== "instruction") ||
        span.result.length !== 1 ||
        span.result[0]?.kind !== "run" ||
        span.beginMarker.fieldLock
      )
        return undefined;
      const p = paragraphs[span.begin.paragraphIndex]!;
      if (
        span.begin.paragraphIndex !== span.end.paragraphIndex ||
        p.sdtWrappers?.length ||
        p.numberingRevision ||
        p.dropCap ||
        p.runs.some(
          (r) =>
            r.revision ||
            r.revisionRangeMarker ||
            r.sdtWrappers?.length ||
            r.styles?.link,
        )
      )
        return undefined;
      const resultIndex = span.result[0].point.runIndex;
      const number = values.get(sequenceOccurrenceKey(p.id, resultIndex));
      if (number === undefined) return undefined;
      const prefix = p.runs
        .slice(0, span.begin.runIndex)
        .map((r) => r.text)
        .join("")
        .replace(/^\s+/, "");
      const suffix = p.runs
        .slice(span.end.runIndex + 1)
        .map((r) => r.text)
        .join("")
        .trim();
      if (
        prefix.length > 256 ||
        suffix.length > 4096 ||
        /[\r\n]/.test(prefix + suffix)
      )
        return undefined;
      const caption = suffix.replace(/^[:;\-\s]+/, "");
      const display = unlabeled
        ? caption
        : `${prefix}${number}${suffix ? `: ${caption}` : ""}`;
      if (!display || display.length > 4096) return undefined;
      result.push({
        identifier,
        number,
        display,
        paragraphId: p.id,
        offset: span.begin.offset,
        sectionIndex,
      });
    }
  }
  return result.sort(
    (a, b) => a.sectionIndex - b.sectionIndex || a.offset - b.offset,
  );
}

export function resolveCaptionPage(
  document: EditorDocument,
  layout: EditorLayoutDocument,
  entry: CaptionOccurrence,
  context = createDocumentFieldContext(document, layout),
): CaptionPage | undefined {
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

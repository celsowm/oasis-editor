import type {
  EditorDocument,
  EditorLayoutDocument,
  EditorParagraphNode,
} from "@/core/model.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import { createDocumentFieldContext } from "./fieldDocumentContext.js";
import {
  collectXeOccurrences,
  resolveXePointPage,
  type XePage,
} from "./xeEntries.js";
import { resolveXeBookmarkRange, type XeRangePage } from "./xeRanges.js";
import { compileFieldInstruction } from "./fieldEvaluation.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";
import { isOffsetInBookmarkScope } from "./bookmarkScope.js";
import { getDocumentSections } from "@/core/model.js";

export interface IndexSettings {
  identifier?: string;
  /** `\b` bookmark restricting the collected entries. */
  bookmark?: string;
  locale?: string;
  entrySeparator: string;
  pageSeparator: string;
  crossReferenceSeparator: string;
  rangeSeparator?: string;
  /** `\c`: columns balanced inside the existing section, 1-4. */
  columns?: number;
  /** `\h`: heading text styled as Index Heading. */
  heading?: string;
  /** `\r`: subentries on the same line. */
  runIn?: boolean;
  /** `\p`: inclusive first-letter range, e.g. "a-m" or "!". */
  letterRange?: string;
  /** `\s`: SEQ identifier for the sequence prefix, with `\d` separator. */
  seqIdentifier?: string;
  seqSeparator?: string;
  /** Prefix resolved from the SEQ value during plan construction. */
  seqPrefix?: string;
  /** `\y`: yomi is accepted but adds no display transformation. */
  yomi?: boolean;
}
export interface IndexPageReference extends XePage {
  bold: boolean;
  italic: boolean;
}
export interface IndexRangeReference {
  pages: XeRangePage[];
  bold: boolean;
  italic: boolean;
}
export interface IndexEntryPlan {
  path: readonly string[];
  pages: IndexPageReference[];
  ranges?: IndexRangeReference[];
  crossReferences: string[];
}
export interface IndexPlan {
  settings: IndexSettings;
  locale: string;
  /** Preorder: parents precede descendants, even without own references. */
  entries: IndexEntryPlan[];
}
const languageIds: Readonly<Record<string, string>> = {
  "1033": "en-US",
  "2057": "en-GB",
  "1046": "pt-BR",
  "2070": "pt-PT",
  "1034": "es-ES",
  "1036": "fr-FR",
  "1031": "de-DE",
};
function supportedLocale(value: string): string | undefined {
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/.test(value)) return undefined;
  try {
    const locale = Intl.getCanonicalLocales(value)[0];
    return locale && Intl.Collator.supportedLocalesOf([locale]).length
      ? locale
      : undefined;
  } catch {
    return undefined;
  }
}
/** Flat indented, one-column INDEX subset. Preserve unsupported instructions.
 * Word-specific default identifier selection differs from ISO/IEC 29500.
 * A locale must be explicit in the field or supplied by a qualified caller.
 */
export function parseIndexInstruction(raw: string): IndexSettings | undefined {
  const parsed = parseFieldInstruction(raw);
  if (parsed.error || parsed.command !== "INDEX") return undefined;
  const settings: IndexSettings = {
    entrySeparator: ", ",
    pageSeparator: ", ",
    crossReferenceSeparator: ". ",
  };
  const args = parsed.tokens.slice(1),
    seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!;
    if (token.kind !== "switch") return undefined;
    const sw = token.value.toLowerCase();
    if (seen.has(sw)) return undefined;
    seen.add(sw);
    if (sw === "r" || sw === "y") {
      if (sw === "r") settings.runIn = true;
      else settings.yomi = true;
      continue;
    }
    const arg = args[++i];
    if (!arg || arg.kind === "switch") return undefined;
    if (sw === "f") {
      if (!/^[A-Za-z]$/.test(arg.value)) return undefined;
      settings.identifier = arg.value;
    } else if (sw === "z") {
      const locale = supportedLocale(languageIds[arg.value] ?? arg.value);
      if (!locale) return undefined;
      settings.locale = locale;
    } else if (sw === "c") {
      const columns = Number(arg.value);
      if (!Number.isInteger(columns) || columns < 1 || columns > 4)
        return undefined;
      if (columns !== 1) settings.columns = columns;
    } else if (sw === "b" || sw === "s") {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(arg.value)) return undefined;
      if (sw === "s") settings.seqIdentifier = arg.value;
      else settings.bookmark = arg.value;
    } else if (sw === "h") {
      if (
        arg.kind !== "quoted" ||
        !arg.value ||
        arg.value.length > 128 ||
        [...arg.value].some(
          (ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127,
        )
      )
        return undefined;
      settings.heading = arg.value;
    } else if (sw === "p") {
      if (arg.value !== "!" && !/^[A-Za-z]-[A-Za-z]$/.test(arg.value))
        return undefined;
      if (
        arg.value !== "!" &&
        arg.value.charCodeAt(0) > arg.value.charCodeAt(2)
      )
        return undefined;
      settings.letterRange = arg.value.toLowerCase();
    } else if (
      sw === "e" ||
      sw === "l" ||
      sw === "k" ||
      sw === "g" ||
      sw === "d"
    ) {
      if (
        arg.kind !== "quoted" ||
        arg.value.length > 15 ||
        [...arg.value].some(
          (ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127,
        )
      )
        return undefined;
      if (sw === "e") settings.entrySeparator = arg.value;
      else if (sw === "l") settings.pageSeparator = arg.value;
      else if (sw === "g") settings.rangeSeparator = arg.value;
      else if (sw === "d") settings.seqSeparator = arg.value;
      else settings.crossReferenceSeparator = arg.value;
    } else return undefined;
  }
  return settings;
}
interface MutableNode {
  label: string;
  path: string[];
  children: Map<string, MutableNode>;
  pages: Map<number, IndexPageReference>;
  ranges: Map<string, IndexRangeReference>;
  crossReferences: Set<string>;
}

/** The visible cached result of the last SEQ occurrence for an identifier. */
function resolveSeqPrefix(
  document: EditorDocument,
  identifier: string,
): string | undefined {
  let prefix: string | undefined;
  for (const section of getDocumentSections(document)) {
    const paragraphs = section.blocks.filter(
      (b): b is EditorParagraphNode => b.type === "paragraph",
    );
    if (paragraphs.length !== section.blocks.length) return undefined;
    const graph = buildFieldStoryGraph(paragraphs);
    if (graph.diagnostics.length) return undefined;
    for (const span of graph.spans) {
      const raw = span.code
        .map((p) => (p.kind === "instruction" ? p.raw : ""))
        .join("");
      const field = compileFieldInstruction(raw);
      if (
        field?.type !== "SEQ" ||
        field.identifier !== identifier.toLowerCase()
      )
        continue;
      if (
        !span.separator ||
        !span.end ||
        span.result.some((p) => p.kind !== "run")
      )
        return undefined;
      const paragraph = paragraphs[span.begin.paragraphIndex]!;
      const value = span.result
        .map((p) =>
          p.kind === "run"
            ? (paragraph.runs.find((r) => r.id === p.point.runId)?.text ?? "")
            : "",
        )
        .join("")
        .trim();
      if (!value || value.length > 64 || !/^[A-Za-z0-9.-]+$/.test(value))
        return undefined;
      prefix = value;
    }
  }
  return prefix;
}

/** Read-only INDEX plan. Exact authored paths are grouped; ambiguous
 * case/canonical-equivalent sibling labels fail closed. Distinct physical
 * pages must never be deduplicated just because printed labels repeat.
 */
export function buildIndexPlan(
  document: EditorDocument,
  layout: EditorLayoutDocument,
  raw: string,
  documentLocale?: string,
): IndexPlan | undefined {
  const settings = parseIndexInstruction(raw);
  if (!settings) return undefined;
  const locale =
    settings.locale ??
    (documentLocale ? supportedLocale(documentLocale) : undefined);
  if (!locale) return undefined;
  const allOccurrences = collectXeOccurrences(document);
  if (!allOccurrences) return undefined;
  let occurrences = allOccurrences;
  if (settings.bookmark) {
    occurrences = [];
    for (const occurrence of allOccurrences) {
      const inside = isOffsetInBookmarkScope(
        document,
        settings.bookmark,
        occurrence.paragraphId,
        occurrence.offset,
      );
      if (inside === undefined) return undefined;
      if (inside) occurrences.push(occurrence);
    }
    if (!occurrences.length) return undefined;
  }
  const context = createDocumentFieldContext(document, layout);
  const collator = new Intl.Collator(locale, {
    usage: "sort",
    sensitivity: "accent",
    numeric: false,
    ignorePunctuation: false,
  });
  const seqValue = settings.seqIdentifier
    ? resolveSeqPrefix(document, settings.seqIdentifier)
    : undefined;
  if (settings.seqIdentifier && seqValue === undefined) return undefined;
  const roots = new Map<string, MutableNode>();
  let nodeCount = 0,
    rangePageCount = 0;
  for (const entry of occurrences) {
    if (entry.identifier !== settings.identifier) {
      // Do not silently guess case semantics for explicit identifiers.
      if (
        entry.identifier !== undefined &&
        settings.identifier !== undefined &&
        entry.identifier.toUpperCase() === settings.identifier.toUpperCase()
      )
        return undefined;
      continue;
    }
    // Semicolon introduces custom sort text in Word; not plain display text.
    if (entry.path.some((p) => p.includes(";") || p !== p.trim()))
      return undefined;
    let children = roots,
      node: MutableNode | undefined;
    const path: string[] = [];
    for (const label of entry.path) {
      path.push(label);
      node = children.get(label);
      if (!node) {
        if (++nodeCount > 8192) return undefined;
        node = {
          label,
          path: [...path],
          children: new Map(),
          pages: new Map(),
          ranges: new Map(),
          crossReferences: new Set(),
        };
        children.set(label, node);
      }
      children = node.children;
    }
    if (!node) return undefined;
    if (entry.reference.kind === "crossReference") {
      node.crossReferences.add(entry.reference.text);
      continue;
    }
    if (entry.reference.kind === "bookmarkRange") {
      const pages = resolveXeBookmarkRange(
        document,
        layout,
        entry.reference.bookmark,
        context,
      );
      if (!pages) return undefined;
      // Bound materialized references even with repeated large ranges.
      const key =
        pages[0]!.physicalPageIndex + ":" + pages.at(-1)!.physicalPageIndex;
      const prior = node.ranges.get(key);
      if (
        prior &&
        (prior.bold !== entry.boldPage ||
          prior.italic !== entry.italicPage ||
          JSON.stringify(prior.pages) !== JSON.stringify(pages))
      )
        return undefined;
      if (!prior) {
        rangePageCount += pages.length;
        if (rangePageCount > 32768) return undefined;
        node.ranges.set(key, {
          pages,
          bold: entry.boldPage,
          italic: entry.italicPage,
        });
      }
      continue;
    }
    const page = resolveXePointPage(document, layout, entry, context);
    if (!page) return undefined;
    const reference = {
      ...page,
      bold: entry.boldPage,
      italic: entry.italicPage,
    };
    const prior = node.pages.get(page.physicalPageIndex);
    if (
      prior &&
      (prior.label !== reference.label ||
        prior.bold !== reference.bold ||
        prior.italic !== reference.italic)
    )
      return undefined;
    node.pages.set(page.physicalPageIndex, reference);
  }
  const entries: IndexEntryPlan[] = [];
  function visit(nodes: Map<string, MutableNode>): boolean {
    const ordered = [...nodes.values()].sort((a, b) =>
      collator.compare(a.label, b.label),
    );
    for (let i = 1; i < ordered.length; i++)
      if (collator.compare(ordered[i - 1]!.label, ordered[i]!.label) === 0)
        return false;
    for (const node of ordered) {
      // Combining page lists and cross-reference text on one line, or several
      // distinct cross references, needs an actual Word oracle before refresh.
      if (
        node.crossReferences.size > 1 ||
        (node.crossReferences.size && (node.pages.size || node.ranges.size))
      )
        return false;
      const ranges = [...node.ranges.values()].sort(
        (a, b) => a.pages[0]!.physicalPageIndex - b.pages[0]!.physicalPageIndex,
      );
      // Do not invent Word's policy for overlapping explicit ranges or
      // point references inside them. Preserve the existing cache instead.
      let last = -1;
      for (const range of ranges) {
        if (
          range.pages[0]!.physicalPageIndex <= last ||
          range.pages.some((p) => node.pages.has(p.physicalPageIndex))
        )
          return false;
        last = range.pages.at(-1)!.physicalPageIndex;
      }
      entries.push({
        path: node.path,
        pages: [...node.pages.values()].sort(
          (a, b) => a.physicalPageIndex - b.physicalPageIndex,
        ),
        ...(ranges.length ? { ranges } : {}),
        crossReferences: [...node.crossReferences],
      });
      if (!visit(node.children)) return false;
    }
    return true;
  }
  if (!visit(roots)) return undefined;
  const resolvedSettings: IndexSettings =
    seqValue === undefined
      ? settings
      : {
          ...settings,
          seqPrefix: `${seqValue}${settings.seqSeparator ?? "-"}`,
        };
  return { settings: resolvedSettings, locale, entries };
}

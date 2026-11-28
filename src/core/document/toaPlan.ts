import type { EditorDocument, EditorLayoutDocument } from "@/core/model.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import { createDocumentFieldContext } from "./fieldDocumentContext.js";
import {
  collectTaOccurrences,
  resolveTaPointPage,
  type TaOccurrence,
  type ToaPage,
} from "./toaEntries.js";
import { resolveBodySequences } from "./sequenceFields.js";
import { resolveXeBookmarkRange, type XeRangePage } from "./xeRanges.js";
import { isOffsetInBookmarkScope } from "./bookmarkScope.js";

export interface ToaSettings {
  category: string;
  bookmark?: string;
  entrySeparator: string;
  pageSeparator: string;
  rangeSeparator: string;
  seqSeparator: string;
  passim: boolean;
  includeHeading: boolean;
  stripSourceFormatting: boolean;
  seqIdentifier?: string;
}
export interface ToaEntryPlan {
  label: string;
  pages: ToaPage[];
  /** Bookmark ranges from TA `\r`, each with its own printed page labels. */
  ranges?: XeRangePage[][];
  bold: boolean;
  italic: boolean;
  prefix?: string;
}
export interface ToaPlan {
  settings: ToaSettings;
  locale: string;
  category: string;
  entries: ToaEntryPlan[];
}

const validSeparator = (value: string): boolean =>
  value.length > 0 &&
  value.length <= 15 &&
  ![...value.replace(/^\t$/, "")].some(
    (ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127,
  );

/** Strict TOA compiler. Documented switches only; duplicates and unknown
 * switches refuse the field instead of being silently ignored. */
export function parseToaInstruction(raw: string): ToaSettings | undefined {
  const parsed = parseFieldInstruction(raw);
  if (parsed.error || parsed.command !== "TOA") return undefined;
  const args = parsed.tokens.slice(1);
  let category: string | undefined;
  let bookmark: string | undefined, seqIdentifier: string | undefined;
  const settings: ToaSettings = {
    category: "1",
    entrySeparator: "\t",
    pageSeparator: ", ",
    rangeSeparator: "–",
    seqSeparator: "-",
    passim: false,
    includeHeading: false,
    stripSourceFormatting: false,
  };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!;
    if (token.kind !== "switch") return undefined;
    const sw = token.value.toLowerCase();
    if (seen.has(sw)) return undefined;
    seen.add(sw);
    if (sw === "p") {
      settings.passim = true;
      continue;
    }
    if (sw === "h") {
      settings.includeHeading = true;
      continue;
    }
    if (sw === "f") {
      settings.stripSourceFormatting = true;
      continue;
    }
    if (!["c", "b", "e", "g", "l", "s", "d"].includes(sw)) return undefined;
    const value = args[++i];
    if (!value || value.kind === "switch") return undefined;
    if (sw === "c") {
      if (
        !value.value ||
        value.value.length > 32 ||
        /\s|["\\]/.test(value.value)
      )
        return undefined;
      category = value.value;
    } else if (sw === "b" || sw === "s") {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(value.value)) return undefined;
      if (sw === "b") bookmark = value.value;
      else seqIdentifier = value.value;
    } else if (
      !validSeparator(value.value) ||
      (value.kind !== "quoted" && value.value !== "\t")
    )
      return undefined;
    else if (sw === "e") settings.entrySeparator = value.value;
    else if (sw === "l") settings.pageSeparator = value.value;
    else if (sw === "g") settings.rangeSeparator = value.value;
    else settings.seqSeparator = value.value;
  }
  if (!category) return undefined;
  return {
    ...settings,
    category,
    ...(bookmark ? { bookmark } : {}),
    ...(seqIdentifier ? { seqIdentifier } : {}),
  };
}

/** Build an immutable TOA plan from qualified point citations. Bookmark
 * ranges, ambiguous locales and unresolved pages fail closed. */
export function buildToaPlan(
  document: EditorDocument,
  layout: EditorLayoutDocument,
  raw: string,
  locale?: string,
): ToaPlan | undefined {
  const settings = parseToaInstruction(raw);
  if (!settings) return undefined;
  if (!locale || !/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/.test(locale))
    return undefined;
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(locale);
  } catch {
    return undefined;
  }
  const collected = collectTaOccurrences(document);
  if (!collected) return undefined;
  let entries = collected;
  if (settings.bookmark) {
    entries = [];
    for (const occurrence of collected) {
      const inside = isOffsetInBookmarkScope(
        document,
        settings.bookmark,
        occurrence.paragraphId,
        occurrence.offset,
      );
      if (inside === undefined) return undefined;
      if (inside) entries.push(occurrence);
    }
    if (!entries.length) return undefined;
  }
  const context = createDocumentFieldContext(document, layout);
  const prefix = settings.seqIdentifier
    ? resolveBodySequences(document).get(settings.seqIdentifier.toLowerCase())
    : undefined;
  if (
    settings.seqIdentifier &&
    (prefix === undefined || !Number.isSafeInteger(prefix))
  )
    return undefined;
  const grouped = new Map<string, ToaEntryPlan>();
  for (const ta of entries as TaOccurrence[]) {
    if (ta.category.toLowerCase() !== settings.category.toLowerCase()) continue;
    const label = ta.short ?? ta.long;
    if (label.length > 4096 || /[\r\n\t]/.test(label)) return undefined;
    let plan = grouped.get(label);
    if (!plan) {
      plan = { label, pages: [], bold: ta.boldPage, italic: ta.italicPage };
      grouped.set(label, plan);
    }
    if (plan.bold !== ta.boldPage || plan.italic !== ta.italicPage)
      return undefined;
    if (ta.bookmark) {
      const pages = resolveXeBookmarkRange(
        document,
        layout,
        ta.bookmark,
        context,
      );
      if (!pages) return undefined;
      plan.ranges ??= [];
      const first = pages[0]!.physicalPageIndex,
        last = pages.at(-1)!.physicalPageIndex;
      if (
        !plan.ranges.some(
          (existing) =>
            existing[0]!.physicalPageIndex === first &&
            existing.at(-1)!.physicalPageIndex === last,
        )
      )
        plan.ranges.push(pages);
      continue;
    }
    const page = resolveTaPointPage(document, layout, ta, context);
    if (!page) return undefined;
    if (!plan.pages.some((p) => p.physicalPageIndex === page.physicalPageIndex))
      plan.pages.push(page);
  }
  const plans = [...grouped.values()];
  plans.sort((a, b) => collator.compare(a.label, b.label));
  if (plans.length > 2048) return undefined;
  for (const plan of plans) {
    plan.pages.sort((a, b) => a.physicalPageIndex - b.physicalPageIndex);
    if (prefix !== undefined) plan.prefix = `${prefix}${settings.seqSeparator}`;
  }
  return { settings, locale, category: settings.category, entries: plans };
}

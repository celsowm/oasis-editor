import type { EditorState } from "@/core/model.js";
import type { EditorParagraphNode } from "@/core/model/types/nodes.js";
import { getDocumentParagraphs } from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";

/** The display sections Word's Show Markup menu filters. */
export type MarkupSection = "insertions" | "deletions" | "comments";

/**
 * View-only Show Markup presentation flags. They live on `EditorState`
 * (never on the document), so Display for Review modes, tracked-change
 * painting and the Reviewing Pane can be filtered without mutating
 * revision data or DOCX output.
 */
export interface MarkupVisibilityState {
  /** Paint insertions (default on). */
  showMarkupInsertions?: boolean;
  /** Paint deletions (default on). */
  showMarkupDeletions?: boolean;
  /** Paint comment highlights (default on). */
  showMarkupComments?: boolean;
  /**
   * Visible markup authors. `undefined` means every author is visible;
   * an array is the explicit author allow-list.
   */
  markupAuthors?: string[];
}

const SECTION_KEY: Record<
  MarkupSection,
  "showMarkupInsertions" | "showMarkupDeletions" | "showMarkupComments"
> = {
  insertions: "showMarkupInsertions",
  deletions: "showMarkupDeletions",
  comments: "showMarkupComments",
};

/** Whether a markup section paints; every section is on by default. */
export function isMarkupSectionShown(
  state: EditorState,
  section: MarkupSection,
): boolean {
  return state[SECTION_KEY[section]] ?? true;
}

/** A single Show Markup menu action, dispatched through the command bus. */
export interface ShowMarkupPayload {
  /** Toggle one revision/comment category. */
  section?: MarkupSection;
  /** Toggle one reviewer's markup. */
  author?: string;
  /** Show every reviewer (`true`) or none of them (`false`). */
  allAuthors?: boolean;
}

/**
 * Read-only snapshot of the Show Markup presentation state for the gallery
 * menu. Never serialized to a document.
 */
export interface MarkupOptionsSnapshot {
  insertions: boolean;
  deletions: boolean;
  comments: boolean;
  /** `true` when `markupAuthors` is absent (all authors visible). */
  allAuthors: boolean;
  /** Explicitly visible authors (empty when all authors are visible). */
  visibleAuthors: string[];
  /** Every author with markup in the document, sorted. */
  knownAuthors: string[];
}

/** Build the reactive Show Markup menu snapshot from the live editor state. */
export function markupOptionsSnapshot(
  state: EditorState,
): MarkupOptionsSnapshot {
  const allAuthors = state.markupAuthors === undefined;
  return {
    insertions: isMarkupSectionShown(state, "insertions"),
    deletions: isMarkupSectionShown(state, "deletions"),
    comments: isMarkupSectionShown(state, "comments"),
    allAuthors,
    visibleAuthors: state.markupAuthors ?? [],
    knownAuthors: collectMarkupAuthors(state),
  };
}

/**
 * Apply one Show Markup menu action to a copy of the state. View-only: no
 * revision data is edited, so the result belongs outside the undo stack.
 */
export function applyShowMarkup(
  state: EditorState,
  payload: ShowMarkupPayload,
): EditorState {
  if (typeof payload.allAuthors === "boolean") {
    return setMarkupAuthors(state, payload.allAuthors ? undefined : []);
  }
  if (typeof payload.author === "string") {
    return toggleMarkupAuthor(
      state,
      payload.author,
      collectMarkupAuthors(state),
    );
  }
  if (payload.section) {
    return toggleShowMarkupSection(state, payload.section);
  }
  return state;
}

/** Whether an author's markup paints; `undefined` means all authors. */
export function isMarkupAuthorShown(
  state: EditorState,
  author: string,
): boolean {
  return state.markupAuthors?.includes(author) ?? true;
}

/** The explicit author allow-list, or null when all authors are shown. */
export function visibleMarkupAuthors(state: EditorState): string[] | null {
  return state.markupAuthors ?? null;
}

/** Flip one markup section; returns the same state when nothing changes. */
export function toggleShowMarkupSection(
  state: EditorState,
  section: MarkupSection,
): EditorState {
  const key = SECTION_KEY[section];
  const next = !(state[key] ?? true);
  if (state[key] === next) return state;
  return { ...state, [key]: next };
}

/**
 * Set the explicit author allow-list. An empty array hides every author;
 * `undefined` restores "all authors". No-op when unchanged.
 */
export function setMarkupAuthors(
  state: EditorState,
  authors: string[] | undefined,
): EditorState {
  if (state.markupAuthors === undefined && authors === undefined) return state;
  if (
    state.markupAuthors !== undefined &&
    authors !== undefined &&
    state.markupAuthors.length === authors.length &&
    state.markupAuthors.every(
      (value, index): boolean => value === authors[index],
    )
  ) {
    return state;
  }
  return {
    ...state,
    markupAuthors: authors,
  };
}

/** Sorted, de-duplicated copy of an author list. */
function sortedUnique(authors: readonly string[]): string[] {
  return [...new Set(authors)].sort();
}

/**
 * Toggle one author in the visible set. The effective set starts from the
 * explicit list (or every known author when all are visible). Hiding the last
 * visible author is allowed and yields an explicit empty list (no authors
 * shown), matching Word's "All Reviewers" unchecked state.
 *
 * When the resulting set equals *every* known author (compared by value, not
 * just count), the explicit allow-list is redundant, so it collapses back to
 * `undefined` ("all authors"). This keeps the state from going stale as new
 * authors appear later.
 */
export function toggleMarkupAuthor(
  state: EditorState,
  author: string,
  knownAuthors: readonly string[],
): EditorState {
  const effective = state.markupAuthors ?? [...knownAuthors];
  const next = effective.includes(author)
    ? effective.filter((value): boolean => value !== author)
    : [...effective, author];
  const sorted = sortedUnique(next);
  const all = sortedUnique(knownAuthors);
  const isEveryAuthor =
    sorted.length === all.length &&
    sorted.every((value, index): boolean => value === all[index]);
  return setMarkupAuthors(state, isEveryAuthor ? undefined : sorted);
}

function collectParagraphAuthors(
  paragraph: EditorParagraphNode,
  authors: Set<string>,
): void {
  for (const run of paragraph.runs) {
    const author = run.revision?.author ?? run.revisionRangeMarker?.author;
    if (author) authors.add(author);
  }
}

/**
 * Every author with markup in the document: tracked-revision authors plus
 * comment authors, sorted for a stable menu. Empty when nothing is marked.
 */
export function collectMarkupAuthors(state: EditorState): string[] {
  const authors = new Set<string>();

  const collectBlocks = (
    blocks: { type: string; runs?: unknown[] }[] | undefined,
  ): void => {
    if (!blocks) return;
    for (const block of blocks) {
      if (block.type !== "paragraph") continue;
      collectParagraphAuthors(block as unknown as EditorParagraphNode, authors);
    }
  };

  const paragraphs = getDocumentParagraphs(state.document);
  for (const paragraph of paragraphs) {
    collectParagraphAuthors(paragraph, authors);
  }

  for (const section of getDocumentSections(state.document)) {
    for (const blocks of [
      section.blocks,
      section.header,
      section.firstPageHeader,
      section.evenPageHeader,
      section.footer,
      section.firstPageFooter,
      section.evenPageFooter,
    ]) {
      collectBlocks(blocks as Parameters<typeof collectBlocks>[0]);
    }
  }

  const footnotes = state.document.footnotes?.items ?? {};
  for (const footnote of Object.values(footnotes)) {
    collectBlocks(footnote.blocks as Parameters<typeof collectBlocks>[0]);
  }
  const endnotes = state.document.endnotes?.items ?? {};
  for (const endnote of Object.values(endnotes)) {
    collectBlocks(endnote.blocks as Parameters<typeof collectBlocks>[0]);
  }

  const comments = state.document.comments?.items ?? {};
  for (const comment of Object.values(comments)) {
    const author = comment.author ?? comment.authorId;
    if (author) authors.add(author);
  }

  return [...authors].sort((left, right): number => left.localeCompare(right));
}

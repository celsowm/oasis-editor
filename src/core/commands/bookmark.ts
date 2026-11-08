/**
 * Bookmark authoring commands.
 *
 * Bookmarks are document-level ranges (see `EditorBookmarks`) independent of
 * the run/paragraph tree: each owns `start`/`end` anchors expressed as a
 * paragraph id plus a character offset into that paragraph's flattened text.
 * This module adds and removes bookmarks over the current selection so they
 * become real targets for internal hyperlinks and future cross-references,
 * and so DOCX export emits the corresponding `w:bookmarkStart`/`w:bookmarkEnd`.
 */
import type {
  EditorBookmark,
  EditorBookmarkAnchor,
  EditorBookmarks,
  EditorDocument,
  EditorState,
} from "@/core/model.js";
import { createEditorBookmarkId } from "@/core/editorState.js";
import { normalizeSelection } from "@/core/selection.js";

/** True when `a` and `b` are exactly the same anchor (block + offset). */
function sameAnchor(a: EditorBookmarkAnchor, b: EditorBookmarkAnchor): boolean {
  return a.paragraphId === b.paragraphId && a.offset === b.offset;
}

/**
 * Add a bookmark over the current selection (single point when collapsed) and
 * keep the selection unchanged. `name` is the Word bookmark / hyperlink /
 * cross-reference target; a deterministic default is used when omitted.
 */
export function createBookmark(state: EditorState, name?: string): EditorState {
  const { start, end, isCollapsed } = normalizeSelection(state);
  const existing = state.document.bookmarks;
  const order = existing?.order ?? [];
  const bookmarkName =
    name && name.trim().length > 0
      ? name.trim()
      : `Bookmark${order.length + 1}`;

  const bookmark: EditorBookmark = {
    id: createEditorBookmarkId(),
    name: bookmarkName,
    start: { paragraphId: start.paragraphId, offset: start.offset },
    ...(isCollapsed
      ? {}
      : { end: { paragraphId: end.paragraphId, offset: end.offset } }),
  };

  const items = { ...(existing?.items ?? {}), [bookmark.id]: bookmark };
  const bookmarks: EditorBookmarks = { items, order: [...order, bookmark.id] };
  const document: EditorDocument = {
    ...state.document,
    bookmarks,
  };
  return { ...state, document };
}

/**
 * Remove a bookmark by editor-local id, returning the same state if it does
 * not exist.
 */
export function removeBookmark(
  state: EditorState,
  bookmarkId: string,
): EditorState {
  const existing = state.document.bookmarks;
  if (!existing || !existing.items[bookmarkId]) {
    return state;
  }
  const items = { ...existing.items };
  delete items[bookmarkId];
  const bookmarks: EditorBookmarks = {
    items,
    order: existing.order.filter((id) => id !== bookmarkId),
  };
  return { ...state, document: { ...state.document, bookmarks } };
}

/** List authorable (non-hidden) bookmarks, for cross-reference/target pickers. */
export function listBookmarks(state: EditorState): EditorBookmark[] {
  const registry = state.document.bookmarks;
  if (!registry) return [];
  return registry.order
    .map((id) => registry.items[id])
    .filter((bookmark): bookmark is EditorBookmark => Boolean(bookmark));
}

/** True when a visible bookmark covers the given (block, offset) anchor. */
export function isAnchorInBookmark(
  state: EditorState,
  anchor: EditorBookmarkAnchor,
): boolean {
  const registry = state.document.bookmarks;
  if (!registry) return false;
  return registry.order.some((id) => {
    const bookmark = registry.items[id];
    if (!bookmark || bookmark.hidden || !bookmark.start) return false;
    return (
      sameAnchor(bookmark.start, anchor) ||
      (bookmark.end !== undefined && sameAnchor(bookmark.end, anchor))
    );
  });
}

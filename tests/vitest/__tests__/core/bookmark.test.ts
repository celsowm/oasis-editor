import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import {
  createBookmark,
  isAnchorInBookmark,
  listBookmarks,
  removeBookmark,
} from "@/core/commands/bookmark.js";

function fixture(selection?: {
  anchor: { paragraphId: string; offset: number };
  focus: { paragraphId: string; offset: number };
}) {
  const paragraph = createEditorParagraph("Hello world");
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  const toPos = (offset: number) =>
    paragraphOffsetToPosition(paragraph, offset);
  return {
    paragraph,
    state: {
      ...state,
      selection: selection
        ? {
            anchor: toPos(selection.anchor.offset),
            focus: toPos(selection.focus.offset),
          }
        : { anchor: toPos(0), focus: toPos(0) },
    },
  };
}

describe("bookmark authoring", () => {
  it("adds a bookmark over a non-collapsed selection with start/end anchors", () => {
    const { paragraph, state } = fixture({
      anchor: { paragraphId: "", offset: 0 },
      focus: { paragraphId: "", offset: 5 },
    });
    const result = createBookmark(state, "Intro");
    const registry = result.document.bookmarks!;
    expect(registry.order).toHaveLength(1);
    const bookmark = registry.items[registry.order[0]!]!;
    expect(bookmark.name).toBe("Intro");
    expect(bookmark.start).toMatchObject({
      paragraphId: paragraph.id,
      offset: 0,
    });
    expect(bookmark.end).toMatchObject({
      paragraphId: paragraph.id,
      offset: 5,
    });
  });

  it("creates a single-point bookmark for a collapsed selection", () => {
    const { paragraph, state } = fixture();
    const result = createBookmark(state, "Caret");
    const bookmark = result.document.bookmarks!.items[
      result.document.bookmarks!.order[0]!
    ]!;
    expect(bookmark.end).toBeUndefined();
    expect(bookmark.start).toMatchObject({ paragraphId: paragraph.id, offset: 0 });
  });

  it("derives a deterministic default name when none is given", () => {
    const { state } = fixture();
    const first = createBookmark(state);
    const name = first.document.bookmarks!.items[
      first.document.bookmarks!.order[0]!
    ]!.name;
    expect(name).toBe("Bookmark1");
  });

  it("removes a bookmark by id and preserves the selection", () => {
    const { state } = fixture({
      anchor: { paragraphId: "", offset: 0 },
      focus: { paragraphId: "", offset: 4 },
    });
    const withBookmark = createBookmark(state);
    const id = withBookmark.document.bookmarks!.order[0]!;
    const removed = removeBookmark(withBookmark, id);
    expect(removed.document.bookmarks!.order).toHaveLength(0);
    expect(removed.document.bookmarks!.items[id]).toBeUndefined();
    expect(removed.selection).toEqual(withBookmark.selection);
  });

  it("is a no-op when removing an unknown bookmark", () => {
    const { state } = fixture();
    expect(removeBookmark(state, "missing")).toBe(state);
  });

  it("lists authorable bookmarks in order", () => {
    const { state } = fixture({
      anchor: { paragraphId: "", offset: 0 },
      focus: { paragraphId: "", offset: 2 },
    });
    const one = createBookmark(state, "A");
    const two = createBookmark(one, "B");
    expect(listBookmarks(two).map((b) => b.name)).toEqual(["A", "B"]);
  });

  it("detects whether an anchor belongs to a bookmark boundary", () => {
    const { paragraph, state } = fixture({
      anchor: { paragraphId: "", offset: 0 },
      focus: { paragraphId: "", offset: 4 },
    });
    const result = createBookmark(state);
    expect(
      isAnchorInBookmark(result, { paragraphId: paragraph.id, offset: 0 }),
    ).toBe(true);
    expect(
      isAnchorInBookmark(result, { paragraphId: paragraph.id, offset: 4 }),
    ).toBe(true);
    expect(
      isAnchorInBookmark(result, { paragraphId: paragraph.id, offset: 2 }),
    ).toBe(false);
  });
});

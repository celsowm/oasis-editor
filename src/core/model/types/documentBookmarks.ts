/**
 * Bookmark registry (Word's `w:bookmarkStart` / `w:bookmarkEnd`).
 *
 * Bookmarks are *ranges* that are independent of the run/paragraph tree: a
 * bookmark can span paragraphs, start and end in different blocks, nest,
 * overlap, or be zero-width. They are therefore modeled as a document-level
 * registry (like footnotes/endnotes) rather than as run attributes. Each
 * bookmark owns two logical anchors — `start` and `end` — expressed as a
 * paragraph id plus a character offset into that paragraph's flattened text.
 *
 * This is the "Phase 1" representation: faithful import/export round-trip and a
 * real target for internal hyperlinks (`#name`). Live-edit transforms
 * (split/merge/paste keeping anchors correct) are intentionally out of scope
 * here.
 */

export interface EditorBookmarkAnchor {
  /** Id of the paragraph this anchor lives in (`EditorParagraphNode.id`). */
  paragraphId: string;
  /** Character offset into the paragraph's flattened text stream. */
  offset: number;
  /**
   * Document order in which the original marker appeared. Used purely to keep a
   * deterministic emit order when several boundaries share one offset.
   */
  seq?: number;
}

export interface EditorBookmark {
  /** Stable editor-local id (not the DOCX `w:id`). */
  id: string;
  /** Word bookmark name; this is the hyperlink / cross-reference target. */
  name: string;
  /** Hidden bookmarks (name starts with "_", e.g. `_Toc...`, `_Ref...`). */
  hidden?: boolean;
  /** Original DOCX `w:id`, used only as a hint for export id stability. */
  docxIdHint?: number;
  /** Table column bookmark range start column (`w:bookmarkStart/@w:colFirst`). */
  colFirst?: number;
  /** Table column bookmark range end column (`w:bookmarkStart/@w:colLast`). */
  colLast?: number;
  /** Start anchor. May be absent for malformed imports (orphan end). */
  start?: EditorBookmarkAnchor;
  /** End anchor. May be absent for malformed imports (orphan start). */
  end?: EditorBookmarkAnchor;
}

export interface EditorBookmarks {
  items: Record<string, EditorBookmark>;
  /** Stable creation/import order for deterministic export. */
  order: string[];
}

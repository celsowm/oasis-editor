/**
 * Comment registry (Word's `w:commentRangeStart` / `w:commentRangeEnd` /
 * `w:commentReference` + the `word/comments.xml` bodies).
 *
 * A comment is two independent things glued by a shared id:
 *  - a *range* over the document text (start/end anchors), independent of the
 *    run/paragraph tree — modeled exactly like {@link EditorBookmark}; and
 *  - a *body* (author, date, text, resolved state) that lives out-of-band in
 *    `word/comments.xml` — modeled like footnotes/endnotes.
 *
 * This is the import/display/export representation: faithful round-trip plus a
 * highlighted range and a hover/click popup. Authoring (create/reply/resolve)
 * and live-edit anchor transforms are intentionally out of scope here.
 */

export interface EditorCommentAnchor {
  /** Id of the paragraph this anchor lives in (`EditorParagraphNode.id`). */
  paragraphId: string;
  /** Character offset into the paragraph's flattened text stream. */
  offset: number;
  /**
   * Document order in which the original marker appeared. Keeps a deterministic
   * emit order when several boundaries share one offset.
   */
  seq?: number;
}

export interface EditorComment {
  /** Stable editor-local id (not the DOCX `w:id`). */
  id: string;
  /** Original DOCX `w:id`, used only as a hint for export id stability. */
  docxIdHint?: number;
  /** `w:comment/@w:author`. */
  author: string;
  /** `w:comment/@w:initials`. */
  initials?: string;
  /** `w:comment/@w:date` as an epoch millisecond timestamp. */
  date?: number;
  /**
   * `w16du:dateUtc` companion UTC timestamp (epoch ms). Round-trip metadata
   * only — preserved verbatim so the UTC date survives export.
   */
  dateUtc?: number;
  /** Resolved/"done" state (`w15:commentEx/@w15:done`). */
  resolved?: boolean;
  /** Flattened comment body text (bodies in scope are single paragraphs). */
  text: string;
  /** Start anchor. May be absent for a malformed import (orphan end). */
  start?: EditorCommentAnchor;
  /** End anchor. May be absent for a malformed import (orphan start). */
  end?: EditorCommentAnchor;
}

export interface EditorComments {
  items: Record<string, EditorComment>;
  /** Stable creation/import order for deterministic export. */
  order: string[];
}

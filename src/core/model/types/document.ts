/**
 * Document-level data: sectioning, page settings, footnotes and the asset
 * registry. The layout model (EditorLayout*) lives in a sibling file so
 * importers and editors can depend on data without pulling rendering types.
 */
import type {
  EditorAsset,
  EditorFootnoteNumberFormat,
  EditorFootnoteRestart,
} from "./primitives.js";
import type { EditorBlockNode } from "./nodes.js";
import type { EditorFootnote } from "./documentFootnotes.js";
import type { EditorEndnote } from "./documentEndnotes.js";
import type { EditorBookmarks } from "./documentBookmarks.js";
import type { EditorComments } from "./documentComments.js";
import type { EditorNamedStyle } from "./styles.js";

export interface EditorPageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
  header: number;
  footer: number;
  gutter: number;
}

/**
 * Newspaper-style multi-column section layout (`w:cols`). Absent for ordinary
 * single-column documents.
 */
export interface EditorColumnsSettings {
  /** `w:num` — number of columns (only meaningful when > 1). */
  count: number;
  /** `w:space` — uniform gap between columns, in px. */
  space: number;
  /** `w:sep` — draw a vertical rule between columns. */
  separator?: boolean;
  /** `w:equalWidth` — defaults to true. */
  equalWidth?: boolean;
  /** Explicit per-column widths/spacing (`<w:col>`); only when unequal. */
  columns?: { width: number; space: number }[];
}

export interface EditorPageSettings {
  width: number;
  height: number;
  orientation?: "portrait" | "landscape";
  margins: EditorPageMargins;
  columns?: EditorColumnsSettings;
}

export interface EditorSection {
  id: string;
  blocks: EditorBlockNode[];
  pageSettings: EditorPageSettings;
  header?: EditorBlockNode[];
  firstPageHeader?: EditorBlockNode[];
  evenPageHeader?: EditorBlockNode[];
  footer?: EditorBlockNode[];
  firstPageFooter?: EditorBlockNode[];
  evenPageFooter?: EditorBlockNode[];
  breakType?: "nextPage" | "continuous";
}

export interface EditorFootnoteSettings {
  numberFormat?: EditorFootnoteNumberFormat;
  restart?: EditorFootnoteRestart;
  startAt?: number;
}

export interface EditorFootnotes {
  items: Record<string, EditorFootnote>;
  settings?: EditorFootnoteSettings;
  separator?: EditorBlockNode[];
  continuationSeparator?: EditorBlockNode[];
}

/**
 * Endnote settings. Reuses the note number-format/restart vocabulary shared
 * with footnotes (both are just "notes" in OOXML terms).
 */
export interface EditorEndnoteSettings {
  numberFormat?: EditorFootnoteNumberFormat;
  restart?: EditorFootnoteRestart;
  startAt?: number;
}

export interface EditorEndnotes {
  items: Record<string, EditorEndnote>;
  settings?: EditorEndnoteSettings;
  separator?: EditorBlockNode[];
  continuationSeparator?: EditorBlockNode[];
}

export interface EditorDocument {
  id: string;
  pageSettings?: EditorPageSettings;
  sections?: EditorSection[];
  styles?: Record<string, EditorNamedStyle>;
  settings?: {
    defaultTabStop?: number;
    /** `w:allowSpaceOfSameStyleInTable`: contextual spacing applies in table cells. */
    allowSpaceOfSameStyleInTable?: boolean;
  };
  /**
   * Out-of-band asset registry. Image runs reference entries here using
   * `src = "asset:<id>"`. The map itself is treated as append-only and is
   * deliberately excluded from per-keystroke equality checks/signatures.
   */
  assets?: Record<string, EditorAsset>;
  footnotes?: EditorFootnotes;
  endnotes?: EditorEndnotes;
  /**
   * Bookmark registry (`w:bookmarkStart`/`w:bookmarkEnd`). Targets for internal
   * hyperlinks (`#name`) and cross-references.
   */
  bookmarks?: EditorBookmarks;
  /**
   * Comment registry (`w:commentRangeStart`/`w:commentRangeEnd` +
   * `word/comments.xml` bodies). Each comment owns a highlighted range and a
   * body shown in a hover/click popup.
   */
  comments?: EditorComments;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
}

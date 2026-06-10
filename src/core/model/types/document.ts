/**
 * Document-level data: sectioning, page settings, footnotes and the asset
 * registry. The layout model (EditorLayout*) lives in a sibling file so
 * importers and editors can depend on data without pulling rendering types.
 */
import type { EditorAsset, EditorFootnoteNumberFormat, EditorFootnoteRestart } from "./primitives.js";
import type { EditorBlockNode } from "./nodes.js";
import type { EditorFootnote } from "./documentFootnotes.js";
import type { EditorEndnote } from "./documentEndnotes.js";
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

export interface EditorPageSettings {
  width: number;
  height: number;
  orientation?: "portrait" | "landscape";
  margins: EditorPageMargins;
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
  };
  /**
   * Out-of-band asset registry. Image runs reference entries here using
   * `src = "asset:<id>"`. The map itself is treated as append-only and is
   * deliberately excluded from per-keystroke equality checks/signatures.
   */
  assets?: Record<string, EditorAsset>;
  footnotes?: EditorFootnotes;
  endnotes?: EditorEndnotes;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
}

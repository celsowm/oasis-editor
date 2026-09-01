/**
 * Document-level data: sectioning, page settings, footnotes and the asset
 * registry. The layout model (EditorLayout*) lives in a sibling file so
 * importers and editors can depend on data without pulling rendering types.
 */
import type {
  EditorAsset,
  EditorFootnoteNumberFormat,
  EditorFootnoteRestart,
  EditorPropertyRevision,
} from "./primitives.js";
import type { EditorBlockNode } from "./nodes.js";
import type { EditorFootnote } from "./documentFootnotes.js";
import type { EditorEndnote } from "./documentEndnotes.js";
import type { EditorBookmarks } from "./documentBookmarks.js";
import type { EditorComments } from "./documentComments.js";
import type { EditorNamedStyle } from "./styles.js";
import type { EditorDocxSourcePackage } from "./docxSourcePackage.js";

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

/** Document-wide visual design selected from the Design ribbon. */
export interface EditorDocumentDesign {
  themeId?: "oasis" | "office" | "facet" | "integral" | "ion" | "retrospect";
  colorSchemeId?: string;
  fontSchemeId?: string;
  paragraphSpacingId?: "compact" | "tight" | "open" | "relaxed";
  effectsId?: string;
  /** Concrete OOXML theme data used to rebuild theme1.xml. */
  themeData?: EditorThemeData;
  pageColor?: string | null;
  watermark?: EditorWatermark | null;
}

export interface EditorThemeData {
  name?: string;
  colors?: Record<string, string>;
  fonts?: {
    major?: Record<string, string>;
    minor?: Record<string, string>;
  };
  /** Theme format/effect markup retained for features not rendered by Oasis. */
  effectsXml?: string;
  /** Original theme XML, used until the user explicitly changes theme data. */
  sourceXml?: string;
}

export interface EditorWatermark {
  kind: "text" | "image";
  text?: string;
  src?: string;
  color?: string;
  opacity?: number;
  rotation?: number;
  scale?: number;
  fontFamily?: string;
  fontSize?: number;
}

export interface EditorPageBorder {
  style: "single" | "double" | "dashed" | "dotted";
  color: string;
  width: number;
  distance?: number;
}

/**
 * Page numbering settings for a section (`w:pgNumType`). Preserved for
 * round-trip; `start` is intended to seed PAGE-field numbering in a future
 * pass. The `format` string is stored verbatim from the OOXML `ST_NumberFormat`
 * vocabulary (decimal, upperRoman, lowerLetter, …) so uncommon values survive
 * round-trip even though the editor only renders a subset.
 */
export interface EditorPageNumbering {
  /** `w:start` — first page number of this section. */
  start?: number;
  /** `w:fmt` — page number format (OOXML `ST_NumberFormat` value). */
  format?: string;
  /** `w:chapStyle` — heading style id used for chapter-based page numbers. */
  chapterStyle?: string;
  /** `w:chapSep` — separator between chapter number and page number. */
  chapterSeparator?: string;
}

/**
 * Vertical justification of a section's page contents (`w:vAlign`).
 * `top` is the Word default and is omitted on export.
 */
export type EditorSectionVerticalAlign = "top" | "center" | "both" | "bottom";

export type EditorSectionBreakType =
  | "nextPage"
  | "continuous"
  | "evenPage"
  | "oddPage"
  | "nextColumn";

/** Previous semantic section properties stored by `w:sectPrChange`. */
export interface EditorSectionPropertiesSnapshot {
  pageSettings: EditorPageSettings;
  pageBorder?: EditorPageBorder | null;
  pageNumbering?: EditorPageNumbering;
  verticalAlignment?: EditorSectionVerticalAlign;
  bidi?: boolean;
  /** Previous `w:type`; semantically this controls how the following section begins. */
  nextBreakType?: EditorSectionBreakType;
}

export interface EditorSection {
  id: string;
  blocks: EditorBlockNode[];
  pageSettings: EditorPageSettings;
  pageBorder?: EditorPageBorder | null;
  header?: EditorBlockNode[];
  firstPageHeader?: EditorBlockNode[];
  evenPageHeader?: EditorBlockNode[];
  footer?: EditorBlockNode[];
  firstPageFooter?: EditorBlockNode[];
  evenPageFooter?: EditorBlockNode[];
  /**
   * How this section *begins* (a page break, a continuous flow, …). Mirrors the
   * editor's own section-break command. OOXML stores this as `w:type` on the
   * *previous* section's `w:sectPr`; the importer applies the off-by-one so the
   * value describes the section it sits on. `nextPage` is the Word default and
   * is omitted on export. Only `continuous` currently affects layout rendering;
   * `evenPage`/`oddPage`/`nextColumn` are preserved for round-trip.
   */
  breakType?: EditorSectionBreakType;
  /** `w:pgNumType` — page numbering format/start/chapter. Round-trip only. */
  pageNumbering?: EditorPageNumbering;
  /** `w:vAlign` — vertical justification of page contents. Round-trip only. */
  verticalAlignment?: EditorSectionVerticalAlign;
  /** `w:bidi` — right-to-left section layout. Round-trip only. */
  bidi?: boolean;
  /** Previous section-property snapshot from `w:sectPrChange`. */
  propertyRevision?: EditorPropertyRevision<EditorSectionPropertiesSnapshot>;
}

/**
 * One `w:font` entry from `word/fontTable.xml`: the document's declaration of a
 * font it uses, with substitution metadata. Preserved for round-trip (and as the
 * basis for future font-substitution decisions). Embedded font references
 * (`w:embedRegular`/etc.) are intentionally not modeled.
 */
export interface EditorFontInfo {
  /** `w:font/@w:name`: the font's primary name (e.g. "Calibri"). */
  name: string;
  /** `w:altName/@w:val`: fallback font name when `name` is unavailable. */
  altName?: string;
  /** `w:family/@w:val`: roman | swiss | modern | script | decorative | auto. */
  family?: string;
  /** `w:pitch/@w:val`: fixed | variable | default. */
  pitch?: string;
  /** `w:charset/@w:val`: character set (hex). */
  charset?: string;
  /** `w:panose1/@w:val`: PANOSE classification (10-byte hex). */
  panose1?: string;
  /** `w:sig` attributes (Unicode/codepage signature bits) preserved verbatim. */
  sig?: Record<string, string>;
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
  /** Serialized document schema revision. Missing values are treated as v1. */
  schemaVersion?: number;
  id: string;
  pageSettings?: EditorPageSettings;
  design?: EditorDocumentDesign;
  sections?: EditorSection[];
  styles?: Record<string, EditorNamedStyle>;
  settings?: {
    defaultTabStop?: number;
    /** `w:allowSpaceOfSameStyleInTable`: contextual spacing applies in table cells. */
    allowSpaceOfSameStyleInTable?: boolean;
    /** `w:autoHyphenation`: automatically hyphenate words at line ends. */
    autoHyphenation?: boolean;
    /** `w:consecutiveHyphenLimit`: max consecutive lines ending with a hyphen (0 = unlimited). */
    consecutiveHyphenLimit?: number;
    /** `w:hyphenationZone`: min trailing gap (points) before a word is hyphenated. */
    hyphenationZone?: number;
    /** `w:doNotHyphenateCaps`: do not hyphenate all-caps words. */
    doNotHyphenateCaps?: boolean;
  };
  /**
   * Original OPC package snapshot for an imported DOCX. The object is shared
   * across editor-state clones and is not traversed by layout or hot mutation
   * paths. It is the preservation source for unsupported package parts.
   */
  sourcePackage?: EditorDocxSourcePackage;
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
  /**
   * `word/fontTable.xml` entries: the fonts the document declares, with
   * substitution metadata. Preserved on import and re-emitted on export.
   */
  fontTable?: EditorFontInfo[];
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
}

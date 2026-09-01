import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorTextStyle,
  EditorImageRunData,
  EditorTextBoxData,
  EditorMathExpression,
  EditorRevision,
  EditorRunBase,
  EditorSdtBlockWrapper,
} from "@/core/model.js";

export type ParseNestedBlocks = (
  container: XmlElement,
) => Promise<EditorBlockNode[]>;

/**
 * A `w:bookmarkStart` / `w:bookmarkEnd` marker carried through the run stream as
 * a zero-length transient run. The import driver extracts these into the
 * document-level bookmark registry once paragraph ids and offsets are known.
 */
export interface ImportedBookmarkMarker {
  kind: "start" | "end";
  docxId: string;
  name?: string;
  colFirst?: number;
  colLast?: number;
}

/**
 * A `w:commentRangeStart` / `w:commentRangeEnd` marker carried through the run
 * stream as a zero-length transient run. The import driver extracts these into
 * the document-level comment registry once paragraph ids and offsets are known.
 */
export interface ImportedCommentMarker {
  kind: "start" | "end";
  docxId: string;
}

export interface ImportedRun {
  text: string;
  image?: EditorImageRunData;
  textBox?: EditorTextBoxData;
  styles?: EditorTextStyle;
  /** Tracked insertion/deletion, optionally paired as a Word move. */
  revision?: EditorRevision;
  /** Zero-length move range start/end marker retained in inline order. */
  revisionRangeMarker?: EditorRunBase["revisionRangeMarker"];
  /** Enclosing inline `w:sdt` wrappers, outermost first. */
  sdtWrappers?: EditorSdtBlockWrapper[];
  field?: { type: "PAGE" | "NUMPAGES" };
  /** Preserved `w:fldChar` control char (complex fields). Zero-length marker. */
  fieldChar?: {
    kind: "begin" | "separate" | "end";
    fieldLock?: boolean;
    dirty?: boolean;
  };
  /** Preserved `w:instrText` / `w:delInstrText`. Zero-length marker. */
  fieldInstruction?: string;
  footnoteReference?: { docxId: string; customMark?: string };
  endnoteReference?: { docxId: string; customMark?: string };
  bookmark?: ImportedBookmarkMarker;
  comment?: ImportedCommentMarker;
  sym?: { font: string; char: string };
  math?: EditorMathExpression;
}

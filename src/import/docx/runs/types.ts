import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorTextStyle,
  EditorImageRunData,
  EditorTextBoxData,
} from "../../../core/model.js";

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

export interface ImportedRun {
  text: string;
  image?: EditorImageRunData;
  textBox?: EditorTextBoxData;
  styles?: EditorTextStyle;
  field?: { type: "PAGE" | "NUMPAGES" };
  /** Preserved `w:fldChar` control char (complex fields). Zero-length marker. */
  fieldChar?: {
    kind: "begin" | "separate" | "end";
    fieldLock?: boolean;
    dirty?: boolean;
  };
  /** Preserved `w:instrText`. Zero-length marker. */
  fieldInstruction?: string;
  footnoteReference?: { docxId: string; customMark?: string };
  endnoteReference?: { docxId: string; customMark?: string };
  bookmark?: ImportedBookmarkMarker;
  sym?: { font: string; char: string };
}

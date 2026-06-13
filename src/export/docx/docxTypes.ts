import type {
  EditorBlockNode,
  EditorImageCrop,
  EditorImageFillMode,
  EditorImageFloatingLayout,
  EditorParagraphListStyle,
  EditorWrapPolygonPoint,
} from "../../core/model.js";
import type { BookmarkEventsByParagraph } from "./bookmarksXml.js";

export interface DocContext {
  numberingInfo: Map<string, { numId: number; level: number }>;
  definitions: Array<{
    kind: EditorParagraphListStyle["kind"];
    level: number;
    abstractNumId: number;
    numId: number;
  }>;
  images: Array<{
    rId: string;
    target: string;
    kind: "embedded" | "linked";
    base64?: string;
    runId: string;
    cx: number;
    cy: number;
    alt?: string;
    crop?: EditorImageCrop;
    fillMode?: EditorImageFillMode;
    rotation?: number;
    flipH?: boolean;
    flipV?: boolean;
    floating?: EditorImageFloatingLayout;
    wrapPolygon?: EditorWrapPolygonPoint[];
  }>;
  imageMap: Map<string, string>;
  /**
   * Maps a text-box run id to the unique `wp:docPr/@id` assigned to its
   * drawing. Text boxes carry no relationship (unlike images), so their docPr
   * ids come from a dedicated counter to stay globally unique.
   */
  textBoxDocPrIds: Map<string, number>;
  hyperlinks: Array<{ rId: string; href: string }>;
  hyperlinkMap: Map<string, string>;
  /**
   * Maps `EditorFootnote.id` to the numeric `w:id` value used when emitting
   * `<w:footnoteReference w:id="N"/>` in the document body. Empty when the
   * document has no footnotes.
   */
  footnoteIdMap?: Map<string, number>;
  /**
   * Maps `EditorEndnote.id` to the numeric `w:id` value used when emitting
   * `<w:endnoteReference w:id="N"/>` in the document body. Empty when the
   * document has no endnotes.
   */
  endnoteIdMap?: Map<string, number>;
  /**
   * Per-paragraph bookmark boundary events (`w:bookmarkStart`/`w:bookmarkEnd`),
   * keyed by `EditorParagraphNode.id`. Shared across all part contexts since
   * paragraph ids are globally unique.
   */
  bookmarkEventsByParagraph?: BookmarkEventsByParagraph;
}

export interface NumberingContext {
  numberingInfo: Map<string, { numId: number; level: number }>;
  definitions: Array<{
    kind: EditorParagraphListStyle["kind"];
    level: number;
    abstractNumId: number;
    numId: number;
  }>;
}

export interface ExportBuildState {
  nextImageId: number;
  /**
   * Next `wp:docPr/@id` for a text-box drawing. Starts in a high range so it
   * never collides with image docPr ids (which are derived from small image
   * relationship numbers).
   */
  nextTextBoxDocPrId: number;
}

export interface PartDefinition {
  kind: "header" | "footer";
  type: "default" | "first" | "even";
  path: string;
  relId: string;
  blocks: EditorBlockNode[];
  context: DocContext;
}

export interface SectionReferenceDefinition {
  header?: Partial<Record<"default" | "first" | "even", { relId: string }>>;
  footer?: Partial<Record<"default" | "first" | "even", { relId: string }>>;
}

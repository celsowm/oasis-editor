import type {
  EditorEditingZone,
  EditorLayoutParagraph,
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorTextBoxData,
} from "@/core/model.js";
import type { CanvasUnsupportedReason } from "./CanvasTableLayout.js";
import type { VerticalRenderMode } from "./verticalText.js";

// Shape of the canvas layout snapshot (screen-anchored geometry read from the
// painted DOM). Extracted from CanvasLayoutSnapshot.ts so the readers and the
// many external consumers share the types without pulling in the DOM-reading
// assembler (S2).

export type ResolveTextBoxRenderHeight = (
  textBox: EditorTextBoxData,
) => number;

export interface CanvasSnapshotSlot {
  offset: number;
  left: number;
  top: number;
  height: number;
}

export interface CanvasSnapshotLine {
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: CanvasSnapshotSlot[];
}

export interface CanvasSnapshotTableCellInfo {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  anchorPosition: EditorPosition;
}

export interface CanvasSnapshotParagraph {
  paragraph: EditorParagraphNode;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  textLength: number;
  left: number;
  top: number;
  width: number;
  height: number;
  lines: CanvasSnapshotLine[];
  tableCell?: CanvasSnapshotTableCellInfo;
  /** Set when the paragraph is painted with a vertical-text transform. */
  verticalMode?: VerticalRenderMode;
}

export interface CanvasSnapshotInlineImage {
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees, when rotated. */
  rotation?: number;
}

export interface CanvasSnapshotFloatingTextBox {
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees, when rotated. */
  rotation?: number;
  /** True when the object is painted behind the text (`behindDoc`). */
  behindDoc?: boolean;
}

export interface CanvasSnapshotFloatingImage {
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees, when rotated. */
  rotation?: number;
  /** True when the object is painted behind the text (`behindDoc`). */
  behindDoc?: boolean;
}

export interface CanvasSnapshotInlineTextBox {
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees, when rotated. */
  rotation?: number;
}

export interface CanvasSnapshotPage {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  bodyTop: number;
  bodyBottom: number;
  footerTop?: number;
  footnoteTop?: number;
  footnoteSeparatorTop?: number;
}

export interface CanvasLayoutSnapshot {
  surfaceRect: DOMRect;
  pages: CanvasSnapshotPage[];
  paragraphs: CanvasSnapshotParagraph[];
  paragraphsById: Map<string, CanvasSnapshotParagraph[]>;
  inlineImages: CanvasSnapshotInlineImage[];
  floatingImages: CanvasSnapshotFloatingImage[];
  inlineTextBoxes: CanvasSnapshotInlineTextBox[];
  floatingTextBoxes: CanvasSnapshotFloatingTextBox[];
  unsupportedRegions: Array<{
    pageIndex: number;
    zone: EditorEditingZone;
    footnoteId?: string;
    left: number;
    top: number;
    width: number;
    height: number;
    reason: CanvasUnsupportedReason;
  }>;
}

export interface BuildCanvasLayoutSnapshotOptions {
  surface: HTMLElement;
  state: EditorState;
  measuredBlockHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  /**
   * Visual zoom factor (CSS `transform: scale(z)`) applied to the surface. The
   * snapshot is built in "screen-anchored local" space so it is invariant under
   * zoom — see the coordinate contract documented on buildCanvasLayoutSnapshot.
   * Defaults to 1 (no zoom).
   */
  zoomFactor?: number;
}

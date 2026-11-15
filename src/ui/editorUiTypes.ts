export interface InputBox {
  left: number;
  top: number;
  height: number;
}

export interface CaretBox extends InputBox {
  visible: boolean;
}

export interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SelectedImageBox {
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees (0 when not rotated). */
  rotation: number;
}

export interface SelectedTextBoxBox {
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees (0 when not rotated). */
  rotation: number;
  /** True when the text box is a floating (anchored) drawing. */
  floating: boolean;
}

/** Bounding box of the table containing the caret (move/resize handles). */
export interface SelectedTableBox {
  tableId: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RevisionBox {
  revisionId: string;
  author: string;
  date: number;
  type: "insert" | "delete" | "merge" | "property" | "grid";
  left: number;
  top: number;
}

/** One decoration rectangle over a tracked insert/delete/formatting range. */
export interface RevisionMarkupBox {
  revisionId: string;
  type: "insert" | "delete" | "property" | "merge" | "grid";
  /**
   * `cell` paints a full table-cell outline; `section` paints the union of a
   * section's paragraphs on each page; `balloon` paints a right-margin reviewer
   * card. All three replace the text underline.
   */
  variant?: "cell" | "section" | "balloon";
  left: number;
  top: number;
  width: number;
  height: number;
  /** `balloon` payload — author/date/snippet for the card. */
  author?: string;
  date?: number;
  snippet?: string;
  /** Connector line from the card back toward the anchor text. */
  connectorLeft?: number;
  connectorTop?: number;
  connectorWidth?: number;
}

/** One highlight rectangle over a commented text range, tagged with its id. */
export interface CommentHighlightBox {
  commentId: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * One vertical margin bar marking a paragraph that contains tracked changes in
 * Simple Markup. Width is fixed by CSS; `left`/`top`/`height` are overlay-local.
 */
export interface ChangeBarBox {
  paragraphId: string;
  left: number;
  top: number;
  height: number;
}

import type { Accessor } from "solid-js";
import type {
  EditorLayoutDocument,
  EditorLayoutParagraph,
  EditorState,
} from "@/core/model.js";
import type { WrapPreset } from "@/core/commands/floatingLayout.js";
import type { ResizeHandleDirection } from "./resizeGeometry.js";

/**
 * State and actions backing the Word-style "Layout Options" popup for the
 * selected image or text box.
 */
export interface LayoutOptionsOverlay {
  /** Which kind of object is currently selected (`null` when none qualifies). */
  target: Accessor<"image" | "textBox" | null>;
  /** Active wrap preset for the selected object (`null` when none). */
  preset: Accessor<WrapPreset | null>;
  /** True when the selected object is pinned to the page. */
  fixedPosition: Accessor<boolean>;
  setPreset: (preset: WrapPreset) => void;
  setFixedPosition: (fixed: boolean) => void;
}

export interface EditorSurfaceProps {
  state: Accessor<EditorState>;
  documentLayout: Accessor<EditorLayoutDocument>;
  remoteWebFonts?: boolean;
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, EditorLayoutParagraph>>;
  /**
   * Phase 4: scroll viewport accessor for page virtualization.
   * When provided, only pages within (or near) the viewport are rendered with
   * their full block content; off-screen pages are replaced with a same-sized
   * placeholder so scroll geometry is preserved. Optional — when omitted, all
   * pages render in full (legacy behaviour).
   */
  viewportRef?: () => HTMLElement | undefined;
  onSurfacePointerDown: (event: PointerEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
  onSurfacePointerMove?: (event: PointerEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onParagraphPointerDown: (
    paragraphId: string,
    event: PointerEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
  onImagePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageResizeHandlePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxResizeHandlePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onTableDragHandlePointerDown: (tableId: string, event: PointerEvent) => void;
  onTableCornerResizeHandlePointerDown: (
    tableId: string,
    event: PointerEvent,
  ) => void;
  onRevisionMouseEnter: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
}

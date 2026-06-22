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

export interface RevisionBox {
  revisionId: string;
  author: string;
  date: number;
  type: "insert" | "delete" | "merge" | "property" | "grid";
  left: number;
  top: number;
}

/** One highlight rectangle over a commented text range, tagged with its id. */
export interface CommentHighlightBox {
  commentId: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

import type { Accessor } from "solid-js";
import type { EditorState, EditorLayoutParagraph } from "@/core/model.js";
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
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onParagraphMouseDown: (
    paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
  onImageMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTableDragHandleMouseDown: (tableId: string, event: MouseEvent) => void;
  onRevisionMouseEnter: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
}

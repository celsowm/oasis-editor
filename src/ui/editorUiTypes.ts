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

export interface RevisionBox {
  revisionId: string;
  author: string;
  date: number;
  type: "insert" | "delete";
  left: number;
  top: number;
}

export type ImageResizeHandleDirection =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export const IMAGE_RESIZE_HANDLE_DIRECTIONS: ImageResizeHandleDirection[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

import type { Accessor } from "solid-js";
import type { EditorState, EditorLayoutParagraph } from "../core/model.js";
import type { ITextMeasurer } from "../core/engine.js";

export interface EditorSurfaceProps {
  state: Accessor<EditorState>;
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, EditorLayoutParagraph>>;
  layoutMode?: "fast" | "wordParity";
  measurer?: ITextMeasurer;
  /**
   * Phase 4: scroll viewport accessor for page virtualization.
   * When provided, only pages within (or near) the viewport are rendered with
   * their full block content; off-screen pages are replaced with a same-sized
   * placeholder so scroll geometry is preserved. Optional — when omitted, all
   * pages render in full (legacy behaviour).
   */
  viewportRef?: () => HTMLElement | undefined;
  onSurfaceMouseDown: (event: MouseEvent) => void;
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
    direction: ImageResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTableDragHandleMouseDown: (tableId: string, event: MouseEvent) => void;
  onRevisionMouseEnter: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
}

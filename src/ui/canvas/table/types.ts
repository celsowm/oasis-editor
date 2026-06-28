import type { EditorParagraphNode, EditorPosition, EditorRevisionMetadata } from "@/core/model.js";
import type { projectParagraphLayout } from "@/layoutProjection/index.js";
import type { VerticalRenderMode } from "../verticalText.js";

export type CanvasUnsupportedReason =
  | "unsupported:v-span"
  | "unsupported:v-merge"
  | "unsupported:nested-table";

export interface CanvasTableBorderSpec {
  width: number;
  color: string;
  type: "solid" | "dashed" | "dotted" | "none";
}

export interface CanvasTableParagraphLayoutEntry {
  paragraph: EditorParagraphNode;
  lines: ReturnType<typeof projectParagraphLayout>["lines"];
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface CanvasTableCellLayoutEntry {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  contentHeight: number;
  shading?: string;
  anchorPosition: EditorPosition;
  padding: { top: number; right: number; bottom: number; left: number };
  borders: {
    top: CanvasTableBorderSpec;
    right: CanvasTableBorderSpec;
    bottom: CanvasTableBorderSpec;
    left: CanvasTableBorderSpec;
    topLeftToBottomRight?: CanvasTableBorderSpec;
    topRightToBottomLeft?: CanvasTableBorderSpec;
  };
  paragraphs: CanvasTableParagraphLayoutEntry[];
  /** Vertical text flow inside this cell (`horizontal` when not rotated). */
  verticalMode: VerticalRenderMode;
  revision?: EditorRevisionMetadata & {
    type: "insert" | "delete" | "merge" | "property";
  };
}

export interface CanvasTableLayoutResult {
  tableId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rowHeights: number[];
  cells: CanvasTableCellLayoutEntry[];
  unsupported: CanvasUnsupportedReason[];
}

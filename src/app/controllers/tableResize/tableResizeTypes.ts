import type { EditorTableNode } from "@/core/model.js";
import type { TableCellLayoutEntry } from "@/core/tableLayout.js";

export type ResizeSide = "left" | "right" | "top" | "bottom";

export interface SnapshotCellRect {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  pageIndex: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  contentMinWidth: number;
  contentMinHeight: number;
}

export interface TableGeometry {
  tableId: string;
  cells: SnapshotCellRect[];
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}

export interface ResizeHoverInfo {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  side: ResizeSide;
  rect: SnapshotCellRect;
  tableNode: EditorTableNode;
  layoutEntry: TableCellLayoutEntry;
  tableGeometry: TableGeometry;
}

export interface TableResizeState {
  type: "column" | "row";
  tableId: string;
  index: number;
  initialPos: number;
  currentPos: number;
  initialRowHeightPx?: number;
  minRowHeightPx?: number;
  columnWidthsPt?: Record<number, number>;
  maxColumnIndex?: number;
  minColumnWidthsPx?: Record<number, number>;
  resizeFromLeftEdge?: boolean;
  initialTableIndentLeftPt?: number;
  guideBounds: { left: number; top: number; width: number; height: number };
}

export interface TableResizeOps {
  resizing: () => TableResizeState | null;
  handleMouseMove: (event: MouseEvent) => void;
  handleMouseDown: (event: MouseEvent) => boolean;
}

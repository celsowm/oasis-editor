import { createSignal } from "solid-js";
import type { EditorState, EditorTableNode } from "../../core/model.js";
import { setTableRowHeight, setTableColumnWidths } from "../../core/editorCommands.js";
import { buildTableCellLayout } from "../../core/tableLayout.js";

export interface TableResizeOps {
  handleMouseMove: (event: MouseEvent) => void;
  handleMouseDown: (event: MouseEvent) => boolean; // returns true if handled
}

export function createEditorTableResize(deps: {
  state: () => EditorState;
  applyTransactionalState: (producer: (current: EditorState) => EditorState) => void;
  surfaceRef: () => HTMLElement | undefined;
}) {
  const [resizing, setResizing] = createSignal<{
    type: "column" | "row";
    tableId: string;
    index: number; // visualColumnIndex or rowIndex
    initialSize: number;
    initialPos: number;
    currentPos: number;
  } | null>(null);

  const getTableAtEvent = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest(".oasis-editor-table-drag-handle")) {
        return null;
    }
    const table = target.closest(".oasis-editor-table-grid") as HTMLElement;
    const tableBlock = target.closest(".oasis-editor-table-block") as HTMLElement;
    if (!table || !tableBlock) return null;

    const tableId = tableBlock.getAttribute("data-source-block-id");
    if (!tableId) return null;

    const cells = Array.from(table.querySelectorAll(".oasis-editor-table-cell")) as HTMLElement[];
    const threshold = 12;

    let closestCell: { cell: HTMLElement; rect: DOMRect; distance: number; side: "left" | "right" | "top" | "bottom" } | null = null;
    let minDistance = threshold;

    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      
      const isVerticallyAligned = event.clientY >= rect.top - threshold && event.clientY <= rect.bottom + threshold;
      const isHorizontallyAligned = event.clientX >= rect.left - threshold && event.clientX <= rect.right + threshold;

      if (isVerticallyAligned) {
          const distRight = Math.abs(event.clientX - rect.right);
          if (distRight < minDistance) {
              minDistance = distRight;
              closestCell = { cell, rect, distance: distRight, side: "right" };
          }
          const distLeft = Math.abs(event.clientX - rect.left);
          if (distLeft < minDistance) {
              minDistance = distLeft;
              closestCell = { cell, rect, distance: distLeft, side: "left" };
          }
      }

      if (isHorizontallyAligned) {
          const distBottom = Math.abs(event.clientY - rect.bottom);
          if (distBottom < minDistance) {
              minDistance = distBottom;
              closestCell = { cell, rect, distance: distBottom, side: "bottom" };
          }
          const distTop = Math.abs(event.clientY - rect.top);
          if (distTop < minDistance) {
              minDistance = distTop;
              closestCell = { cell, rect, distance: distTop, side: "top" };
          }
      }
    }

    if (!closestCell) return null;

    const rowIndex = parseInt(closestCell.cell.getAttribute("data-row-index") || "-1", 10);
    const cellIndex = parseInt(closestCell.cell.getAttribute("data-cell-index") || "-1", 10);

    return { 
      tableId, 
      rowIndex, 
      cellIndex, 
      cell: closestCell.cell, 
      rect: closestCell.rect, 
      side: closestCell.side, 
      table, 
      tableBlock,
      allCellsInTable: cells
    };
  };

  const handleMouseMove = (event: MouseEvent) => {
    const currentResizing = resizing();
    
    if (currentResizing) {
      if (currentResizing.type === "column") {
        document.body.classList.add("oasis-editor-hover-col-resize");
        document.body.classList.remove("oasis-editor-hover-row-resize");
      } else {
        document.body.classList.add("oasis-editor-hover-row-resize");
        document.body.classList.remove("oasis-editor-hover-col-resize");
      }
      return;
    }

    const info = getTableAtEvent(event);
    if (!info) {
        document.body.classList.remove("oasis-editor-hover-col-resize");
        document.body.classList.remove("oasis-editor-hover-row-resize");
        return;
    }

    const isCol = info.side === "left" || info.side === "right";
    if (isCol) {
        document.body.classList.add("oasis-editor-hover-col-resize");
        document.body.classList.remove("oasis-editor-hover-row-resize");
    } else {
        document.body.classList.add("oasis-editor-hover-row-resize");
        document.body.classList.remove("oasis-editor-hover-col-resize");
    }
  };

  const handleMouseDown = (event: MouseEvent) => {
    const info = getTableAtEvent(event);
    if (!info) return false;

    const state = deps.state();
    const allBlocks = [
      ...state.document.blocks,
      ...(state.document.sections?.flatMap(s => [
        ...s.blocks,
        ...(s.header ?? []),
        ...(s.footer ?? [])
      ]) ?? [])
    ];
    const tableNode = allBlocks.find(b => b.id === info.tableId) as EditorTableNode;
    if (!tableNode) return false;

    const layout = buildTableCellLayout(tableNode);
    const entry = layout.find(e => e.rowIndex === info.rowIndex && e.cellIndex === info.cellIndex);
    if (!entry) return false;

    const isCol = info.side === "left" || info.side === "right";

    if (isCol) {
      const visualColumnIndex = info.side === "left" 
        ? entry.visualColumnIndex - 1 
        : entry.visualColumnIndex + entry.colSpan - 1;

      if (visualColumnIndex < 0) return false;

      let initialSize = info.rect.width;
      let initialPos = info.rect.right;
      
      if (info.side === "left") {
          initialPos = info.rect.left;
          const prevCell = info.allCellsInTable.find(c => 
             Math.abs(c.getBoundingClientRect().right - info.rect.left) < 2 && 
             Math.abs(c.getBoundingClientRect().top - info.rect.top) < 2
          );
          if (prevCell) {
              initialSize = prevCell.getBoundingClientRect().width;
          } else {
              const prevEntry = layout.find(e => (e.visualColumnIndex + e.colSpan - 1) === visualColumnIndex);
              initialSize = typeof prevEntry?.cell.style?.width === "number" ? prevEntry.cell.style.width / 0.75 : 100;
          }
      }

      setResizing({
        type: "column",
        tableId: info.tableId,
        index: visualColumnIndex,
        initialSize, 
        initialPos, 
        currentPos: initialPos,
      });

      document.body.classList.add("oasis-editor-hover-col-resize");
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      event.preventDefault();
      event.stopPropagation();
      return true;
    } else {
      const visualRowIndex = info.side === "top" ? info.rowIndex - 1 : info.rowIndex;
      if (visualRowIndex < 0) return false;

      let initialSize = info.rect.height;
      let initialPos = info.rect.bottom;

      if (info.side === "top") {
          initialPos = info.rect.top;
          const prevCell = info.allCellsInTable.find(c => 
             Math.abs(c.getBoundingClientRect().bottom - info.rect.top) < 2 && 
             Math.abs(c.getBoundingClientRect().left - info.rect.left) < 2
          );
          if (prevCell) {
              initialSize = prevCell.getBoundingClientRect().height;
          } else {
              const row = tableNode.rows[visualRowIndex];
              initialSize = typeof row?.style?.height === "number" ? row.style.height / 0.75 : 30;
          }
      }

      setResizing({
        type: "row",
        tableId: info.tableId,
        index: visualRowIndex,
        initialSize,
        initialPos,
        currentPos: initialPos,
      });

      document.body.classList.add("oasis-editor-hover-row-resize");
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    const currentResizing = resizing();
    if (!currentResizing) return;
    
    setResizing({
      ...currentResizing,
      currentPos: currentResizing.type === "column" ? event.clientX : event.clientY
    });

    if (currentResizing.type === "column") {
      document.body.classList.add("oasis-editor-hover-col-resize");
    } else {
      document.body.classList.add("oasis-editor-hover-row-resize");
    }
  };

  const handleWindowMouseUp = (event: MouseEvent) => {
    const currentResizing = resizing();
    if (!currentResizing) return;

    const delta = (currentResizing.type === "column" ? event.clientX : event.clientY) - currentResizing.initialPos;
    
    if (Math.abs(delta) >= 2) {
      // Convert pixels to points (1px = 0.75pt)
      const deltaPt = delta * 0.75;
      
      deps.applyTransactionalState((current) => {
        if (currentResizing.type === "row") {
          const newSizePt = Math.max(10, (currentResizing.initialSize + delta) * 0.75);
          return setTableRowHeight(current, currentResizing.tableId, currentResizing.index, newSizePt);
        } else {
          console.log(`[TableResize] MouseUp: deltaPx=${delta}, deltaPt=${deltaPt.toFixed(2)}, initialSizePx=${currentResizing.initialSize}`);
          const allBlocks = [
            ...current.document.blocks,
            ...(current.document.sections?.flatMap(s => [
              ...s.blocks,
              ...(s.header ?? []),
              ...(s.footer ?? [])
            ]) ?? [])
          ];
          const tableNode = allBlocks.find(b => b.id === currentResizing.tableId) as EditorTableNode;
          
          const columnWidthsToSet: Record<number, number> = {};
          let maxColIndex = 0;
          
          if (tableNode) {
              const layout = buildTableCellLayout(tableNode);
              const tableEl = document.querySelector(`[data-source-block-id="${currentResizing.tableId}"] .oasis-editor-table-grid`);
              if (tableEl) {
                  const cells = Array.from(tableEl.querySelectorAll(".oasis-editor-table-cell"));
                  for (const entry of layout) {
                      maxColIndex = Math.max(maxColIndex, entry.visualColumnIndex + entry.colSpan - 1);
                      if (entry.colSpan === 1 && columnWidthsToSet[entry.visualColumnIndex] === undefined) {
                          const domCell = cells.find(c => 
                              c.getAttribute("data-row-index") === entry.rowIndex.toString() && 
                              c.getAttribute("data-cell-index") === entry.cellIndex.toString()
                          );
                          if (domCell) {
                              const rect = domCell.getBoundingClientRect();
                              console.log(`[TableResize] Reading DOM width for col ${entry.visualColumnIndex}: ${rect.width}px (${(rect.width * 0.75).toFixed(2)}pt)`);
                              columnWidthsToSet[entry.visualColumnIndex] = rect.width * 0.75;
                          }
                      }
                  }
              }
          }
          
          // Fill missing with fallback
          for (let i = 0; i <= maxColIndex; i++) {
              if (columnWidthsToSet[i] === undefined) {
                  console.log(`[TableResize] Missing DOM width for col ${i}, falling back to 50pt`);
                  columnWidthsToSet[i] = 50;
              }
          }
          
          const isLastColumn = currentResizing.index === maxColIndex;
          const oldWidth = columnWidthsToSet[currentResizing.index];
          let newWidth = oldWidth + deltaPt;
          
          if (newWidth < 10) newWidth = 10;
          
          if (!isLastColumn) {
              const nextColIndex = currentResizing.index + 1;
              const oldNextWidth = columnWidthsToSet[nextColIndex];
              let newNextWidth = oldNextWidth - (newWidth - oldWidth);
              
              if (newNextWidth < 10) {
                  newNextWidth = 10;
                  // Restrict the growth of the current column so we don't shrink the next below 10
                  newWidth = oldWidth + (oldNextWidth - 10);
              }
              
              console.log(`[TableResize] Applying to col ${currentResizing.index}: ${oldWidth.toFixed(2)}pt -> ${newWidth.toFixed(2)}pt`);
              console.log(`[TableResize] Compensating col ${nextColIndex}: ${oldNextWidth.toFixed(2)}pt -> ${newNextWidth.toFixed(2)}pt`);
              
              columnWidthsToSet[currentResizing.index] = newWidth;
              columnWidthsToSet[nextColIndex] = newNextWidth;
          } else {
              console.log(`[TableResize] Applying to last col ${currentResizing.index}: ${oldWidth.toFixed(2)}pt -> ${newWidth.toFixed(2)}pt`);
              columnWidthsToSet[currentResizing.index] = newWidth;
          }
          
          const tableWidthPt = Object.values(columnWidthsToSet).reduce((a, b) => a + b, 0);
          console.log(`[TableResize] Total locked table width: ${tableWidthPt.toFixed(2)}pt`);

          return setTableColumnWidths(current, currentResizing.tableId, columnWidthsToSet, tableWidthPt);
        }
      });
    }

    setResizing(null);
    document.body.classList.remove("oasis-editor-hover-col-resize");
    document.body.classList.remove("oasis-editor-hover-row-resize");
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  return {
    resizing,
    handleMouseMove,
    handleMouseDown,
  };
}

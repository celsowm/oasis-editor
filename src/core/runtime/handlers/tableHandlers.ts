import { EditorState } from "../EditorState.js";
import { OperationType, EditorOperation } from "../../operations/OperationTypes.js";
import { findParentTable } from "../../document/BlockUtils.js";
import { isTextBlock, BlockNode } from "../../document/BlockTypes.js";
import { LogicalPosition } from "../../selection/SelectionTypes.js";
import { createTable, createTableRow, createTableCell, createParagraph } from "../../document/DocumentFactory.js";
import { registerHandler } from "../OperationHandlers.js";

function updateDocumentSections(
  state: EditorState,
  blockId: string,
  updater: (block: BlockNode) => BlockNode | BlockNode[] | null,
): EditorState {
  const zone = state.editingMode;
  const nextSections = state.document.sections.map((section) => {
    let childrenToTransform: BlockNode[] = section.children;
    if (zone === "header") childrenToTransform = section.header || [];
    else if (zone === "footer") childrenToTransform = section.footer || [];

    const transformed = transformBlocks(childrenToTransform, (block) => {
      if (block.id === blockId) {
        return updater(block);
      }
      return block;
    });

    if (zone === "header") return { ...section, header: transformed };
    if (zone === "footer") return { ...section, footer: transformed };
    return { ...section, children: transformed };
  });

  return {
    ...state,
    document: {
      ...state.document,
      revision: state.document.revision + 1,
      sections: nextSections,
    },
  };
}

function transformBlocks(
  blocks: BlockNode[],
  updater: (block: BlockNode) => BlockNode | BlockNode[] | null,
): BlockNode[] {
  const result: BlockNode[] = [];
  for (const block of blocks) {
    const updated = updater(block);
    if (updated === null) continue;
    if (Array.isArray(updated)) {
      result.push(...updated);
    } else {
      result.push(updated);
    }
  }
  return result;
}

export function tableAddRow(
  state: EditorState,
  op: EditorOperation,
  isAbove: boolean,
): EditorState {
  const { tableId, referenceBlockId } = op.payload as { tableId: string; referenceBlockId: string };
  const tableInfo = findParentTable(state.document, referenceBlockId);
  if (!tableInfo) return state;

  const insertIdx = isAbove ? tableInfo.rowIdx : tableInfo.rowIdx + 1;

  return updateDocumentSections(state, tableId, (block) => {
    if (block.kind !== "table") return block;
    const rows = [...block.rows];
    rows.splice(insertIdx, 0, createTableRow(block.columnWidths.length));
    return { ...block, rows };
  });
}

export function tableAddColumn(
  state: EditorState,
  op: EditorOperation,
  isLeft: boolean,
): EditorState {
  const { tableId, referenceBlockId } = op.payload as { tableId: string; referenceBlockId: string };
  const tableInfo = findParentTable(state.document, referenceBlockId);
  if (!tableInfo) return state;

  const insertIdx = isLeft ? tableInfo.cellIdx : tableInfo.cellIdx + 1;

  return updateDocumentSections(state, tableId, (block) => {
    if (block.kind !== "table") return block;

    const columnWidths = [...block.columnWidths];
    const refIdx = tableInfo.cellIdx;
    const currentWidth = columnWidths[refIdx];
    const halfWidth = Math.max(30, Math.floor(currentWidth / 2));

    columnWidths[refIdx] = currentWidth - halfWidth;
    columnWidths.splice(insertIdx, 0, halfWidth);

    const rows = block.rows.map((row) => {
      const cells = [...row.cells];
      cells.splice(insertIdx, 0, createTableCell());
      return { ...row, cells };
    });
    return { ...block, rows, columnWidths };
  });
}

export function registerTableHandlers(): void {
  registerHandler(OperationType.INSERT_TABLE, (state, op) => {
    const { document, selection } = state;
    const {
      rows,
      cols,
      newTableId,
      newRowIds,
      newCellIds,
      newParaIds,
      newRunIds,
    } = op.payload;

    const tableNode = createTable(rows, cols);
    if (newTableId) tableNode.id = newTableId;
    if (newRowIds) {
      tableNode.rows.forEach((row, rIdx) => {
        row.id = newRowIds[rIdx];
        row.cells.forEach((cell, cIdx) => {
          const globalIdx = rIdx * cols + cIdx;
          cell.id = newCellIds?.[globalIdx] || cell.id;
          if (cell.children[0] && isTextBlock(cell.children[0])) {
            cell.children[0].id = newParaIds?.[globalIdx] || cell.children[0].id;
            if (cell.children[0].children[0]) {
              cell.children[0].children[0].id =
                newRunIds?.[globalIdx] || cell.children[0].children[0].id;
            }
          }
        });
      });
    }

    let insertSectionIdx = 0;
    let insertBlockIdx = -1;
    if (selection) {
      for (let sIdx = 0; sIdx < document.sections.length; sIdx++) {
        const idx = document.sections[sIdx].children.findIndex(
          (b) => b.id === selection.anchor.blockId,
        );
        if (idx !== -1) {
          insertSectionIdx = sIdx;
          insertBlockIdx = idx;
          break;
        }
      }
    }

    const nextSections = document.sections.map((section, sIdx) => {
      if (sIdx !== insertSectionIdx) return section;
      const children = [...section.children];
      children.splice(insertBlockIdx + 1, 0, tableNode);
      return { ...section, children };
    });

    const firstCell = tableNode.rows[0].cells[0];
    const firstPara = isTextBlock(firstCell.children[0])
      ? firstCell.children[0]
      : createParagraph("");
    const newPos: LogicalPosition = {
      sectionId: document.sections[insertSectionIdx].id,
      blockId: firstPara.id,
      inlineId: firstPara.children[0].id,
      offset: 0,
    };

    return {
      ...state,
      document: {
        ...document,
        revision: document.revision + 1,
        sections: nextSections,
      },
      selection: { anchor: newPos, focus: newPos },
      selectedImageId: null,
    };
  });

  registerHandler(OperationType.TABLE_ADD_ROW_ABOVE, (state, op) =>
    tableAddRow(state, op, true),
  );

  registerHandler(OperationType.TABLE_ADD_ROW_BELOW, (state, op) =>
    tableAddRow(state, op, false),
  );

  registerHandler(OperationType.TABLE_ADD_COLUMN_LEFT, (state, op) =>
    tableAddColumn(state, op, true),
  );

  registerHandler(OperationType.TABLE_ADD_COLUMN_RIGHT, (state, op) =>
    tableAddColumn(state, op, false),
  );

  registerHandler(OperationType.TABLE_DELETE_ROW, (state, op) => {
    const { tableId, referenceBlockId } = op.payload;
    const tableInfo = findParentTable(state.document, referenceBlockId);
    if (!tableInfo) return state;

    return {
      ...updateDocumentSections(state, tableId, (block) => {
        if (block.kind !== "table") return block;
        if (block.rows.length <= 1) return block;
        const rows = [...block.rows];
        rows.splice(tableInfo.rowIdx, 1);
        return { ...block, rows };
      }),
      selection: null,
    };
  });

  registerHandler(OperationType.TABLE_DELETE_COLUMN, (state, op) => {
    const { tableId, referenceBlockId } = op.payload;
    const tableInfo = findParentTable(state.document, referenceBlockId);
    if (!tableInfo) return state;

    return {
      ...updateDocumentSections(state, tableId, (block) => {
        if (block.kind !== "table") return block;
        if (block.columnWidths.length <= 1) return block;

        const columnWidths = [...block.columnWidths];
        const deletedWidth = columnWidths[tableInfo.cellIdx];
        columnWidths.splice(tableInfo.cellIdx, 1);

        const neighborIdx = tableInfo.cellIdx > 0 ? tableInfo.cellIdx - 1 : 0;
        columnWidths[neighborIdx] += deletedWidth;

        const rows = block.rows.map((row) => {
          const cells = [...row.cells];
          cells.splice(tableInfo.cellIdx, 1);
          return { ...row, cells };
        });
        return { ...block, rows, columnWidths };
      }),
      selection: null,
    };
  });

  registerHandler(OperationType.TABLE_DELETE, (state, op) => {
    const { tableId } = op.payload;
    return {
      ...updateDocumentSections(state, tableId, () => null),
      selection: null,
    };
  });

  registerHandler(OperationType.TABLE_MERGE_CELLS, (state, op) => {
    const { tableId, anchorBlockId, targetBlockId } = op.payload;
    const tableInfoAnchor = findParentTable(state.document, anchorBlockId);
    const tableInfoTarget = findParentTable(state.document, targetBlockId);
    if (!tableInfoAnchor || !tableInfoTarget || tableInfoAnchor.table.id !== tableId) return state;

    const startRow = Math.min(tableInfoAnchor.rowIdx, tableInfoTarget.rowIdx);
    const endRow = Math.max(tableInfoAnchor.rowIdx, tableInfoTarget.rowIdx);
    const startCol = Math.min(tableInfoAnchor.cellIdx, tableInfoTarget.cellIdx);
    const endCol = Math.max(tableInfoAnchor.cellIdx, tableInfoTarget.cellIdx);

    const rowSpan = endRow - startRow + 1;
    const colSpan = endCol - startCol + 1;
    if (rowSpan === 1 && colSpan === 1) return state;

    return updateDocumentSections(state, tableId, (block) => {
      if (block.kind !== "table") return block;
      const rows = block.rows.map((row, rIdx) => {
        const cells = row.cells.map((cell, cIdx) => {
          if (rIdx === startRow && cIdx === startCol) {
            return { ...cell, colSpan, rowSpan };
          }
          if (rIdx >= startRow && rIdx <= endRow && cIdx >= startCol && cIdx <= endCol) {
            // Mark continuation cells with colSpan=0, rowSpan=0 to indicate they're merged
            return { ...cell, colSpan: 0, rowSpan: 0 };
          }
          return cell;
        });
        return { ...row, cells };
      });
      return { ...block, rows };
    });
  });

  registerHandler(OperationType.TABLE_SPLIT_CELL, (state, op) => {
    const { tableId, referenceBlockId } = op.payload;
    const tableInfo = findParentTable(state.document, referenceBlockId);
    if (!tableInfo) return state;

    return updateDocumentSections(state, tableId, (block) => {
      if (block.kind !== "table") return block;
      const rows = block.rows.map((row, rIdx) => {
        const cells = row.cells.map((cell, cIdx) => {
          if (cell.colSpan && cell.colSpan > 1 && cell.rowSpan && cell.rowSpan > 1) {
            if (rIdx === tableInfo.rowIdx && cIdx === tableInfo.cellIdx) {
              return { ...cell, colSpan: 1, rowSpan: 1 };
            }
          } else if (cell.colSpan && cell.colSpan > 1) {
            if (rIdx === tableInfo.rowIdx && cIdx === tableInfo.cellIdx) {
              return { ...cell, colSpan: 1 };
            }
          } else if (cell.rowSpan && cell.rowSpan > 1) {
            if (rIdx === tableInfo.rowIdx && cIdx === tableInfo.cellIdx) {
              return { ...cell, rowSpan: 1 };
            }
          }
          // Restore continuation cells that were marked with 0
          if (cell.colSpan === 0 || cell.rowSpan === 0) {
            return { ...cell, colSpan: 1, rowSpan: 1 };
          }
          return cell;
        });
        return { ...row, cells };
      });
      return { ...block, rows };
    });
  });
}

import { cloneBlock } from "@/core/cloneState.js";
import {
  createEditorParagraph,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  paragraphOffsetToPosition,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorState,
  type EditorTableCellNode,
  type EditorTableNode,
  type EditorTableRowNode,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import {
  findCellAtVisualColumn,
  findFirstNavigableParagraphInTable,
  getRowVisualWidth,
  getTableVisualWidth,
} from "./tableOpsSelectionNavigation.js";
import { updateBlocksInCurrentSection } from "./tableOpsMutationCommands.js";
import { createTableRevisionMetadata } from "@/core/commands/table/tableCommandUtils.js";

interface TableRowColumnOperationsDeps {
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[];
}

export function createTableRowColumnOperations(
  deps: TableRowColumnOperationsDeps,
) {
  const insertSelectedTableRow = (
    current: EditorState,
    direction: -1 | 1,
  ): EditorState => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return current;
    }

    const targetBlocks = [...deps.getTargetBlocks(current, location.zone)];
    const originalTableBlock = targetBlocks[location.blockIndex];
    if (originalTableBlock) {
      targetBlocks[location.blockIndex] = cloneBlock(originalTableBlock);
    }
    const tableBlock = targetBlocks[location.blockIndex] as EditorTableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const sourceRow = tableBlock.rows[location.rowIndex];
    if (!sourceRow) {
      return current;
    }

    const insertIndex = Math.max(
      0,
      Math.min(
        tableBlock.rows.length,
        location.rowIndex + (direction > 0 ? 1 : 0),
      ),
    );

    const hasVerticalSpansInTable = tableBlock.rows.some((row) =>
      row.cells.some(
        (cell) =>
          Math.max(1, cell.rowSpan ?? 1) > 1 || cell.vMerge !== undefined,
      ),
    );

    let blankRow: EditorTableRowNode;
    if (hasVerticalSpansInTable) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (layoutEntry) =>
          layoutEntry.rowIndex === location.rowIndex &&
          layoutEntry.cellIndex === location.cellIndex,
      );
      const sourceEntries = tableLayout.filter(
        (layoutEntry) => layoutEntry.rowIndex === location.rowIndex,
      );
      const templateEntries =
        sourceEntries.length > 0
          ? sourceEntries
          : tableLayout.filter(
              (layoutEntry) =>
                layoutEntry.rowIndex === Math.max(0, location.rowIndex - 1),
            );
      blankRow = createEditorTableRow(
        templateEntries.map((layoutEntry) => {
          const spanningEntry = tableLayout.find(
            (candidate) =>
              candidate.visualColumnIndex === layoutEntry.visualColumnIndex &&
              candidate.visualRowIndex < insertIndex &&
              candidate.visualRowIndex + candidate.rowSpan > insertIndex,
          );
          if (spanningEntry) {
            spanningEntry.cell.rowSpan =
              Math.max(1, spanningEntry.cell.rowSpan ?? 1) + 1;
            spanningEntry.cell.vMerge = "restart";
            const placeholder = createEditorTableCell(
              [createEditorParagraph("")],
              layoutEntry.colSpan,
            );
            placeholder.blocks = [];
            placeholder.vMerge = "continue";
            return placeholder;
          }

          return createEditorTableCell(
            [createEditorParagraph("")],
            layoutEntry.colSpan,
          );
        }),
      );
      if (current.trackChangesEnabled) {
        blankRow.style = {
          ...(blankRow.style ?? {}),
          revision: {
            ...createTableRevisionMetadata(),
            type: "insert",
          },
        };
      }
      tableBlock.rows.splice(insertIndex, 0, blankRow);

      const targetVisualColumn =
        selectedEntry?.visualColumnIndex ?? location.cellIndex;
      const targetCell = findCellAtVisualColumn(blankRow, targetVisualColumn);
      const nextParagraph =
        targetCell?.blocks[0] ??
        blankRow.cells.find(
          (cell) => cell.vMerge !== "continue" && cell.blocks[0],
        )?.blocks[0] ??
        findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return updateBlocksInCurrentSection(
          current,
          targetBlocks,
          location.zone,
        );
      }

      const nextState = updateBlocksInCurrentSection(
        current,
        targetBlocks,
        location.zone,
      );
      return {
        ...nextState,
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    }

    blankRow = createEditorTableRow(
      sourceRow.cells.map((cell) =>
        createEditorTableCell(
          [createEditorParagraph("")],
          Math.max(1, cell.colSpan ?? 1),
        ),
      ),
    );
    if (current.trackChangesEnabled) {
      blankRow.style = {
        ...(blankRow.style ?? {}),
        revision: {
          ...createTableRevisionMetadata(),
          type: "insert",
        },
      };
    }
    tableBlock.rows.splice(insertIndex, 0, blankRow);

    const targetCell =
      blankRow.cells[Math.min(location.cellIndex, blankRow.cells.length - 1)];
    const nextParagraph =
      targetCell?.blocks[0] ??
      blankRow.cells.find(
        (cell) => cell.vMerge !== "continue" && cell.blocks[0],
      )?.blocks[0] ??
      findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const nextState = updateBlocksInCurrentSection(
      current,
      targetBlocks,
      location.zone,
    );
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const deleteSelectedTableRow = (current: EditorState): EditorState => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return current;
    }

    const targetBlocks = [...deps.getTargetBlocks(current, location.zone)];
    const originalTableBlock = targetBlocks[location.blockIndex];
    if (originalTableBlock) {
      targetBlocks[location.blockIndex] = cloneBlock(originalTableBlock);
    }
    const tableBlock = targetBlocks[location.blockIndex] as EditorTableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    if (tableBlock.rows.length <= 1 && !current.trackChangesEnabled) {
      return current;
    }

    const rowToDelete = tableBlock.rows[location.rowIndex];
    if (!rowToDelete) {
      return current;
    }
    if (current.trackChangesEnabled) {
      rowToDelete.style = {
        ...(rowToDelete.style ?? {}),
        revision: {
          ...createTableRevisionMetadata(),
          type: "delete",
        },
      };
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const blockedByRestartCell = rowToDelete.cells.some(
      (cell) =>
        cell.vMerge !== "continue" && Math.max(1, cell.rowSpan ?? 1) > 1,
    );
    if (blockedByRestartCell) {
      return current;
    }

    const hasVerticalSpansInTable = tableBlock.rows.some((row) =>
      row.cells.some(
        (cell) =>
          Math.max(1, cell.rowSpan ?? 1) > 1 || cell.vMerge !== undefined,
      ),
    );

    const selectedEntry = hasVerticalSpansInTable
      ? buildTableCellLayout(tableBlock).find(
          (layoutEntry) =>
            layoutEntry.rowIndex === location.rowIndex &&
            layoutEntry.cellIndex === location.cellIndex,
        )
      : null;

    if (hasVerticalSpansInTable) {
      const tableLayout = buildTableCellLayout(tableBlock);
      for (const entry of tableLayout) {
        if (
          entry.visualRowIndex < location.rowIndex &&
          entry.visualRowIndex + entry.rowSpan > location.rowIndex
        ) {
          entry.cell.rowSpan = Math.max(1, entry.cell.rowSpan ?? 1) - 1;
          if (entry.cell.rowSpan <= 1) {
            entry.cell.rowSpan = undefined;
            entry.cell.vMerge = undefined;
          } else {
            entry.cell.vMerge = "restart";
          }
        }
      }
    }

    tableBlock.rows.splice(location.rowIndex, 1);

    const nextRow =
      tableBlock.rows[Math.min(location.rowIndex, tableBlock.rows.length - 1)];
    const targetCell = nextRow
      ? findCellAtVisualColumn(
          nextRow,
          Math.min(
            selectedEntry?.visualColumnIndex ?? location.cellIndex,
            Math.max(0, getRowVisualWidth(nextRow) - 1),
          ),
        )
      : null;
    const nextParagraph =
      targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const nextState = updateBlocksInCurrentSection(
      current,
      targetBlocks,
      location.zone,
    );
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const insertSelectedTableColumn = (
    current: EditorState,
    direction: -1 | 1,
  ): EditorState => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return current;
    }

    const targetBlocks = [...deps.getTargetBlocks(current, location.zone)];
    const originalTableBlock = targetBlocks[location.blockIndex];
    if (originalTableBlock) {
      targetBlocks[location.blockIndex] = cloneBlock(originalTableBlock);
    }
    const tableBlock = targetBlocks[location.blockIndex] as EditorTableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const hasHorizontalSpansInTable = tableBlock.rows.some((row) =>
      row.cells.some((cell) => Math.max(1, cell.colSpan ?? 1) > 1),
    );

    if (hasHorizontalSpansInTable) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (entry) =>
          entry.rowIndex === location.rowIndex &&
          entry.cellIndex === location.cellIndex,
      );
      const insertVisualColumn =
        (selectedEntry?.visualColumnIndex ?? location.cellIndex) +
        (direction > 0 ? Math.max(1, selectedEntry?.colSpan ?? 1) : 0);

      for (const row of tableBlock.rows) {
        const nextCells: EditorTableCellNode[] = [];
        let visualCursor = 0;
        let inserted = false;

        for (const cell of row.cells) {
          const span = Math.max(1, cell.colSpan ?? 1);
          if (!inserted && insertVisualColumn <= visualCursor) {
            const insertedCell = createEditorTableCell([
              createEditorParagraph(""),
            ]);
            if (current.trackChangesEnabled) {
              insertedCell.style = {
                revision: {
                  ...createTableRevisionMetadata(),
                  type: "insert",
                },
              };
            }
            nextCells.push(insertedCell);
            inserted = true;
          }

          if (
            !inserted &&
            visualCursor < insertVisualColumn &&
            insertVisualColumn < visualCursor + span
          ) {
            nextCells.push({
              ...cell,
              colSpan: span + 1,
              ...(current.trackChangesEnabled
                ? {
                    style: {
                      ...(cell.style ?? {}),
                      revision: {
                        ...createTableRevisionMetadata(),
                        type: "merge" as const,
                        previous: { colSpan: cell.colSpan },
                      },
                    },
                  }
                : {}),
            });
            inserted = true;
          } else {
            nextCells.push(cell);
          }

          visualCursor += span;
        }

        if (!inserted) {
          const insertedCell = createEditorTableCell([
            createEditorParagraph(""),
          ]);
          if (current.trackChangesEnabled) {
            insertedCell.style = {
              revision: {
                ...createTableRevisionMetadata(),
                type: "insert",
              },
            };
          }
          nextCells.push(insertedCell);
        }

        row.cells = nextCells;
      }

      const targetRow = tableBlock.rows[location.rowIndex];
      const targetCell = targetRow
        ? findCellAtVisualColumn(targetRow, insertVisualColumn)
        : null;
      const nextParagraph =
        targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return updateBlocksInCurrentSection(
          current,
          targetBlocks,
          location.zone,
        );
      }

      const nextState = updateBlocksInCurrentSection(
        current,
        targetBlocks,
        location.zone,
      );
      return {
        ...nextState,
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    }

    const insertIndex = Math.max(
      0,
      Math.min(
        tableBlock.rows[0]?.cells.length ?? 0,
        location.cellIndex + (direction > 0 ? 1 : 0),
      ),
    );

    for (const row of tableBlock.rows) {
      const insertedCell = createEditorTableCell([createEditorParagraph("")]);
      if (current.trackChangesEnabled) {
        insertedCell.style = {
          revision: {
            ...createTableRevisionMetadata(),
            type: "insert",
          },
        };
      }
      row.cells.splice(insertIndex, 0, insertedCell);
    }

    const targetRow = tableBlock.rows[location.rowIndex];
    const targetCell = targetRow?.cells[insertIndex];
    const nextParagraph =
      targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const nextState = updateBlocksInCurrentSection(
      current,
      targetBlocks,
      location.zone,
    );
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const deleteSelectedTableColumn = (current: EditorState): EditorState => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return current;
    }

    const targetBlocks = [...deps.getTargetBlocks(current, location.zone)];
    const originalTableBlock = targetBlocks[location.blockIndex];
    if (originalTableBlock) {
      targetBlocks[location.blockIndex] = cloneBlock(originalTableBlock);
    }
    const tableBlock = targetBlocks[location.blockIndex] as EditorTableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    if (getTableVisualWidth(tableBlock) <= 1) {
      return current;
    }

    if (current.trackChangesEnabled) {
      const layout = buildTableCellLayout(tableBlock);
      const selected = layout.find(
        (entry) =>
          entry.rowIndex === location.rowIndex &&
          entry.cellIndex === location.cellIndex,
      );
      const visualColumn = selected?.visualColumnIndex ?? location.cellIndex;
      for (const row of tableBlock.rows) {
        const cell = findCellAtVisualColumn(row, visualColumn);
        if (cell) {
          cell.style = {
            ...(cell.style ?? {}),
            revision: {
              ...createTableRevisionMetadata(),
              type: "delete",
            },
          };
        }
      }
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const hasHorizontalSpansInTable = tableBlock.rows.some((row) =>
      row.cells.some((cell) => Math.max(1, cell.colSpan ?? 1) > 1),
    );

    if (hasHorizontalSpansInTable) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (entry) =>
          entry.rowIndex === location.rowIndex &&
          entry.cellIndex === location.cellIndex,
      );
      const deleteVisualColumn =
        selectedEntry?.visualColumnIndex ?? location.cellIndex;

      for (const row of tableBlock.rows) {
        const nextCells: EditorTableCellNode[] = [];
        let visualCursor = 0;

        for (const cell of row.cells) {
          const span = Math.max(1, cell.colSpan ?? 1);
          if (
            deleteVisualColumn >= visualCursor &&
            deleteVisualColumn < visualCursor + span
          ) {
            if (span > 1) {
              nextCells.push({
                ...cell,
                colSpan: span - 1 > 1 ? span - 1 : undefined,
              });
            }
          } else {
            nextCells.push(cell);
          }

          visualCursor += span;
        }

        row.cells = nextCells;
      }

      const targetRow = tableBlock.rows[location.rowIndex];
      const targetCell =
        targetRow &&
        findCellAtVisualColumn(
          targetRow,
          Math.min(
            deleteVisualColumn,
            Math.max(0, getRowVisualWidth(targetRow) - 1),
          ),
        );
      const nextParagraph =
        targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return updateBlocksInCurrentSection(
          current,
          targetBlocks,
          location.zone,
        );
      }

      const nextState = updateBlocksInCurrentSection(
        current,
        targetBlocks,
        location.zone,
      );
      return {
        ...nextState,
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    }

    if (tableBlock.rows[0]?.cells.length <= 1) {
      return current;
    }

    for (const row of tableBlock.rows) {
      row.cells.splice(location.cellIndex, 1);
    }

    const targetRow = tableBlock.rows[location.rowIndex];
    const targetCell =
      targetRow?.cells[
        Math.min(location.cellIndex, targetRow.cells.length - 1)
      ];
    const nextParagraph =
      targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const nextState = updateBlocksInCurrentSection(
      current,
      targetBlocks,
      location.zone,
    );
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  return {
    insertSelectedTableRow,
    deleteSelectedTableRow,
    insertSelectedTableColumn,
    deleteSelectedTableColumn,
  };
}

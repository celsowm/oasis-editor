import { cloneBlock } from "../../core/cloneState.js";
import {
  createEditorParagraph,
  createEditorTableCell,
} from "../../core/editorState.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  paragraphOffsetToPosition,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
} from "../../core/model.js";
import { updateBlocksInCurrentSection } from "./tableOpsMutationCommands.js";
import type {
  HorizontalTableCellRange,
  VerticalTableCellRange,
} from "./tableOpsSelectionRanges.js";

interface TableCellSpanOperationsDeps {
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[];
  resolveHorizontalTableCellRange: (
    current: EditorState,
  ) => HorizontalTableCellRange | null;
  resolveVerticalTableCellRange: (
    current: EditorState,
  ) => VerticalTableCellRange | null;
  canMergeSelectedTableCells: (current: EditorState) => boolean;
  canMergeSelectedTableRows: (current: EditorState) => boolean;
  canSplitSelectedTableCell: (current: EditorState) => boolean;
  canSplitSelectedTableCellVertically: (current: EditorState) => boolean;
}

export function createTableCellSpanOperations(
  deps: TableCellSpanOperationsDeps,
) {
  const mergeSelectedTableCells = (current: EditorState): EditorState => {
    const range = deps.resolveHorizontalTableCellRange(current);
    if (!range) {
      return current;
    }

    const currentBlocks = deps.getTargetBlocks(current, range.zone);
    const originalTable = currentBlocks[range.blockIndex];
    if (!originalTable || originalTable.type !== "table") {
      return current;
    }
    const targetBlocks = [...currentBlocks];
    const tableBlock = cloneBlock(originalTable) as EditorTableNode;
    targetBlocks[range.blockIndex] = tableBlock;

    const row = tableBlock.rows[range.rowIndex];
    if (!row) {
      return current;
    }

    const selectedCells = row.cells.slice(
      range.startCellIndex,
      range.endCellIndex + 1,
    );
    if (selectedCells.length < 2) {
      return current;
    }

    const mergedCell = {
      ...selectedCells[0]!,
      colSpan: selectedCells.reduce(
        (sum, cell) => sum + Math.max(1, cell.colSpan ?? 1),
        0,
      ),
      blocks: selectedCells.flatMap((cell) =>
        cell.blocks.map((paragraph) => cloneBlock(paragraph)),
      ) as EditorParagraphNode[],
    };

    row.cells.splice(range.startCellIndex, selectedCells.length, mergedCell);

    const nextParagraph = mergedCell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    const nextState = updateBlocksInCurrentSection(
      current,
      targetBlocks,
      range.zone,
    );
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const mergeSelectedTableRows = (current: EditorState): EditorState => {
    const range = deps.resolveVerticalTableCellRange(current);
    if (!range) {
      return current;
    }

    const currentBlocks = deps.getTargetBlocks(current, range.zone);
    const originalTable = currentBlocks[range.blockIndex];
    if (!originalTable || originalTable.type !== "table") {
      return current;
    }
    const targetBlocks = [...currentBlocks];
    const tableBlock = cloneBlock(originalTable) as EditorTableNode;
    targetBlocks[range.blockIndex] = tableBlock;

    const selectedCells: Array<
      NonNullable<(typeof tableBlock.rows)[number]["cells"][number]>
    > = [];
    for (
      let rowIndex = range.startRowIndex;
      rowIndex <= range.endRowIndex;
      rowIndex += 1
    ) {
      const row = tableBlock.rows[rowIndex];
      const cell = row?.cells[range.cellIndex];
      if (
        !row ||
        !cell ||
        cell.vMerge === "continue" ||
        cell.blocks.length !== 1
      ) {
        return current;
      }
      selectedCells.push(cell);
    }

    if (selectedCells.length < 2) {
      return current;
    }

    const mergedColSpan = Math.max(1, selectedCells[0]!.colSpan ?? 1);
    if (
      !selectedCells.every(
        (cell) => Math.max(1, cell.colSpan ?? 1) === mergedColSpan,
      )
    ) {
      return current;
    }

    const mergedCell = {
      ...selectedCells[0]!,
      rowSpan: selectedCells.length,
      vMerge: "restart" as const,
      blocks: selectedCells.flatMap((cell) =>
        cell.blocks.map((paragraph) => cloneBlock(paragraph)),
      ) as EditorParagraphNode[],
    };
    tableBlock.rows[range.startRowIndex]!.cells[range.cellIndex] = mergedCell;

    for (
      let rowIndex = range.startRowIndex + 1;
      rowIndex <= range.endRowIndex;
      rowIndex += 1
    ) {
      const placeholder = createEditorTableCell(
        [createEditorParagraph("")],
        mergedColSpan,
      );
      placeholder.blocks = [];
      placeholder.vMerge = "continue";
      tableBlock.rows[rowIndex]!.cells[range.cellIndex] = placeholder;
    }

    const nextParagraph = mergedCell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    const nextState = updateBlocksInCurrentSection(
      current,
      targetBlocks,
      range.zone,
    );
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const mergeSelectedTable = (current: EditorState): EditorState => {
    if (deps.canMergeSelectedTableCells(current)) {
      return mergeSelectedTableCells(current);
    }

    if (deps.canMergeSelectedTableRows(current)) {
      return mergeSelectedTableRows(current);
    }

    return current;
  };

  const splitSelectedTableCellVertically = (
    current: EditorState,
  ): EditorState => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return current;
    }

    const currentBlocks = deps.getTargetBlocks(current, location.zone);
    const originalTable = currentBlocks[location.blockIndex];
    if (!originalTable || originalTable.type !== "table") {
      return current;
    }
    const targetBlocks = [...currentBlocks];
    const tableBlock = cloneBlock(originalTable) as EditorTableNode;
    targetBlocks[location.blockIndex] = tableBlock;

    const cell = tableBlock.rows[location.rowIndex]?.cells[location.cellIndex];
    const span = Math.max(1, cell?.rowSpan ?? 1);
    if (!cell || span <= 1 || cell.vMerge !== "restart") {
      return current;
    }

    cell.rowSpan = undefined;
    cell.vMerge = undefined;

    const preservedColSpan = Math.max(1, cell.colSpan ?? 1);

    for (let offset = 1; offset < span; offset += 1) {
      const row = tableBlock.rows[location.rowIndex + offset];
      if (!row) {
        break;
      }
      const replacement = createEditorTableCell(
        [createEditorParagraph("")],
        preservedColSpan,
      );
      row.cells[location.cellIndex] = replacement;
    }

    const nextParagraph = cell.blocks[0];
    if (!nextParagraph) {
      return current;
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

  const splitSelectedTableCell = (current: EditorState): EditorState => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return current;
    }

    const currentBlocks = deps.getTargetBlocks(current, location.zone);
    const originalTable = currentBlocks[location.blockIndex];
    if (!originalTable || originalTable.type !== "table") {
      return current;
    }
    const targetBlocks = [...currentBlocks];
    const tableBlock = cloneBlock(originalTable) as EditorTableNode;
    targetBlocks[location.blockIndex] = tableBlock;

    const row = tableBlock.rows[location.rowIndex];
    const cell = row?.cells[location.cellIndex];
    const span = Math.max(1, cell?.colSpan ?? 1);
    if (!row || !cell || span <= 1) {
      return current;
    }

    const nextCells = [
      {
        ...cell,
        colSpan: 1,
        blocks: cell.blocks.map((paragraph) =>
          cloneBlock(paragraph),
        ) as EditorParagraphNode[],
      },
      ...Array.from({ length: span - 1 }, () =>
        createEditorTableCell([createEditorParagraph("")]),
      ),
    ];

    row.cells.splice(location.cellIndex, 1, ...nextCells);

    const nextParagraph = nextCells[0]?.blocks[0];
    if (!nextParagraph) {
      return current;
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

  const splitSelectedTable = (current: EditorState): EditorState => {
    if (deps.canSplitSelectedTableCellVertically(current)) {
      return splitSelectedTableCellVertically(current);
    }

    if (deps.canSplitSelectedTableCell(current)) {
      return splitSelectedTableCell(current);
    }

    return current;
  };

  return {
    mergeSelectedTableCells,
    mergeSelectedTableRows,
    mergeSelectedTable,
    splitSelectedTableCellVertically,
    splitSelectedTableCell,
    splitSelectedTable,
  };
}

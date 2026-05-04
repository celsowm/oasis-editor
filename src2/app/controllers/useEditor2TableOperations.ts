import {
  cloneBlock,
} from "../../core/cloneState.js";
import {
  createEditor2Document,
  createEditor2Paragraph,
  createEditor2TableCell,
  createEditor2TableRow,
} from "../../core/editorState.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getParagraphs,
  getDocumentSections,
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type Editor2BlockNode,
  type Editor2Document,
  type Editor2LayoutParagraph,
  type Editor2ParagraphNode,
  type Editor2ParagraphListStyle,
  type Editor2ParagraphStyle,
  type Editor2Position,
  type Editor2State,
  type Editor2TableNode,
  type Editor2TableCellNode,
  type Editor2TableRowNode,
  type Editor2TextRun,
  type Editor2EditingZone,
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "../../core/tableLayout.js";
import { insertTableAtSelection } from "../../core/editorCommands.js";
import type { Editor2Logger } from "../../utils/logger.js";

export interface Editor2TableOperationsDeps {
  applyTransactionalState: (
    producer: (current: Editor2State) => Editor2State,
    options?: { mergeKey?: string },
  ) => void;
  applySelectionToStatePreservingStructure: (
    current: Editor2State,
    nextSelection: Editor2State["selection"],
  ) => Editor2State;
  focusInput: () => void;
  logger?: Editor2Logger;
}

export function createEditor2TableOperations(deps: Editor2TableOperationsDeps) {
  const getTargetBlocks = (state: Editor2State, zone: Editor2EditingZone): Editor2BlockNode[] => {
    const activeSectionIndex = getActiveSectionIndex(state);
    const hasSections = state.document.sections && state.document.sections.length > 0;
    const section = hasSections ? state.document.sections![activeSectionIndex] : null;

    if (section) {
      if (zone === "header") return section.header || [];
      if (zone === "footer") return section.footer || [];
      return section.blocks;
    }
    return state.document.blocks;
  };

  const resolveTableCellRangeSelection = (
    current: Editor2State,
  ): Editor2State["selection"] | null => {
    const sel = current.selection;
    const anchorLocation = findParagraphTableLocation(current.document, sel.anchor.paragraphId, getActiveSectionIndex(current));
    const focusLocation = findParagraphTableLocation(current.document, sel.focus.paragraphId, getActiveSectionIndex(current));
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      anchorLocation.zone !== focusLocation.zone ||
      (anchorLocation.rowIndex === focusLocation.rowIndex &&
        anchorLocation.cellIndex === focusLocation.cellIndex)
    ) {
      deps.logger?.debug(`resolveTableCellRangeSelection: no expansion (anchor=${sel.anchor.paragraphId} focus=${sel.focus.paragraphId})`);
      return null;
    }

    const rangeStartRow = Math.min(anchorLocation.rowIndex, focusLocation.rowIndex);
    const rangeEndRow = Math.max(anchorLocation.rowIndex, focusLocation.rowIndex);
    const rangeStartCell = Math.min(anchorLocation.cellIndex, focusLocation.cellIndex);
    const rangeEndCell = Math.max(anchorLocation.cellIndex, focusLocation.cellIndex);
    deps.logger?.info(`resolveTableCellRangeSelection: expanding r${anchorLocation.rowIndex}:c${anchorLocation.cellIndex}→r${focusLocation.rowIndex}:c${focusLocation.cellIndex} (anchor=${sel.anchor.paragraphId} focus=${sel.focus.paragraphId}) range=[rows ${rangeStartRow}..${rangeEndRow}, cells ${rangeStartCell}..${rangeEndCell}]`);

    const blocks = getTargetBlocks(current, anchorLocation.zone);
    const tableBlock = blocks[anchorLocation.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return null;
    }

    const tableLayout = buildTableCellLayout(tableBlock);
    const anchorCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
    );
    const focusCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
    );
    if (!anchorCell || !focusCell) {
      return null;
    }

    const compareCellLocations = (
      left: TableCellLayoutEntry,
      right: TableCellLayoutEntry,
    ) => {
      if (left.visualRowIndex !== right.visualRowIndex) {
        return left.visualRowIndex - right.visualRowIndex;
      }
      if (left.visualColumnIndex !== right.visualColumnIndex) {
        return left.visualColumnIndex - right.visualColumnIndex;
      }
      return 0;
    };

    const startLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? anchorLocation : focusLocation;
    const endLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? focusLocation : anchorLocation;

    const startParagraph =
      tableBlock.rows[startLocation.rowIndex]?.cells[startLocation.cellIndex]?.blocks[0];
    const endCell = tableBlock.rows[endLocation.rowIndex]?.cells[endLocation.cellIndex];
    const endParagraph = endCell?.blocks[endCell.blocks.length - 1];
    if (!startParagraph || !endParagraph) {
      return null;
    }

    return {
      anchor: paragraphOffsetToPosition(startParagraph, 0),
      focus: paragraphOffsetToPosition(endParagraph, getParagraphText(endParagraph).length),
    };
  };

  const resolveSelectedTableCells = (
    current: Editor2State,
  ): { blockIndex: number; cells: TableCellLayoutEntry[]; zone: Editor2EditingZone } | null => {
    const sel = current.selection;
    const anchorLocation = findParagraphTableLocation(
      current.document,
      sel.anchor.paragraphId,
      getActiveSectionIndex(current),
    );
    const focusLocation = findParagraphTableLocation(
      current.document,
      sel.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      anchorLocation.zone !== focusLocation.zone
    ) {
      return null;
    }

    const blocks = getTargetBlocks(current, anchorLocation.zone);
    const tableBlock = blocks[anchorLocation.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return null;
    }

    const tableLayout = buildTableCellLayout(tableBlock);
    const anchorCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
    );
    const focusCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
    );
    if (!anchorCell || !focusCell) {
      return null;
    }

    const startRow = Math.min(anchorCell.visualRowIndex, focusCell.visualRowIndex);
    const endRow = Math.max(
      anchorCell.visualRowIndex + anchorCell.rowSpan - 1,
      focusCell.visualRowIndex + focusCell.rowSpan - 1,
    );
    const startCol = Math.min(anchorCell.visualColumnIndex, focusCell.visualColumnIndex);
    const endCol = Math.max(
      anchorCell.visualColumnIndex + anchorCell.colSpan - 1,
      focusCell.visualColumnIndex + focusCell.colSpan - 1,
    );

    const cells = tableLayout.filter((entry) => {
      return (
        entry.visualRowIndex <= endRow &&
        entry.visualRowIndex + entry.rowSpan - 1 >= startRow &&
        entry.visualColumnIndex <= endCol &&
        entry.visualColumnIndex + entry.colSpan - 1 >= startCol
      );
    });

    return { blockIndex: anchorLocation.blockIndex, cells, zone: anchorLocation.zone };
  };

  const resolveHorizontalTableCellRange = (
    current: Editor2State,
  ): {
    blockIndex: number;
    rowIndex: number;
    startCellIndex: number;
    endCellIndex: number;
    zone: Editor2EditingZone;
  } | null => {
    const anchorLocation = findParagraphTableLocation(current.document, current.selection.anchor.paragraphId, getActiveSectionIndex(current));
    const focusLocation = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      anchorLocation.zone !== focusLocation.zone
    ) {
      return null;
    }

    const blocks = getTargetBlocks(current, anchorLocation.zone);
    const tableBlock = blocks[anchorLocation.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return null;
    }

    const tableLayout = buildTableCellLayout(tableBlock);
    const anchorCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
    );
    const focusCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
    );
    if (!anchorCell || !focusCell) {
      return null;
    }

    const compareCellLocations = (
      left: TableCellLayoutEntry,
      right: TableCellLayoutEntry,
    ) => {
      if (left.visualRowIndex !== right.visualRowIndex) {
        return left.visualRowIndex - right.visualRowIndex;
      }
      if (left.visualColumnIndex !== right.visualColumnIndex) {
        return left.visualColumnIndex - right.visualColumnIndex;
      }
      return 0;
    };

    const startLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? anchorLocation : focusLocation;
    const endLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? focusLocation : anchorLocation;

    if (anchorCell.visualRowIndex !== focusCell.visualRowIndex) {
      return null;
    }

    if (compareCellLocations(anchorCell, focusCell) === 0) {
      return null;
    }

    return {
      blockIndex: anchorLocation.blockIndex,
      rowIndex: startLocation.rowIndex,
      startCellIndex: startLocation.cellIndex,
      endCellIndex: endLocation.cellIndex,
      zone: anchorLocation.zone,
    };
  };

  const canMergeSelectedTableCells = (current: Editor2State): boolean => {
    const range = resolveHorizontalTableCellRange(current);
    return Boolean(range && range.endCellIndex > range.startCellIndex);
  };

  const canSplitSelectedTableCell = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return false;
    }

    const blocks = getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    const cell = block.rows[location.rowIndex]?.cells[location.cellIndex];
    return Boolean((cell?.colSpan ?? 1) > 1);
  };

  const resolveVerticalTableCellRange = (
    current: Editor2State,
  ): {
    blockIndex: number;
    startRowIndex: number;
    endRowIndex: number;
    cellIndex: number;
    zone: Editor2EditingZone;
  } | null => {
    const anchorLocation = findParagraphTableLocation(current.document, current.selection.anchor.paragraphId, getActiveSectionIndex(current));
    const focusLocation = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      anchorLocation.cellIndex !== focusLocation.cellIndex ||
      anchorLocation.zone !== focusLocation.zone
    ) {
      return null;
    }

    const blocks = getTargetBlocks(current, anchorLocation.zone);
    const tableBlock = blocks[anchorLocation.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return null;
    }

    const tableLayout = buildTableCellLayout(tableBlock);
    const anchorCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
    );
    const focusCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
    );
    if (!anchorCell || !focusCell) {
      return null;
    }

    const startRowIndex = Math.min(anchorCell.visualRowIndex, focusCell.visualRowIndex);
    const endRowIndex = Math.max(anchorCell.visualRowIndex, focusCell.visualRowIndex);
    if (startRowIndex === endRowIndex) {
      return null;
    }

    return {
      blockIndex: anchorLocation.blockIndex,
      startRowIndex,
      endRowIndex,
      cellIndex: anchorLocation.cellIndex,
      zone: anchorLocation.zone,
    };
  };

  const canMergeSelectedTableRows = (current: Editor2State): boolean => {
    const range = resolveVerticalTableCellRange(current);
    if (!range) {
      return false;
    }

    const blocks = getTargetBlocks(current, range.zone);
    const tableBlock = blocks[range.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return false;
    }

    for (let rowIndex = range.startRowIndex; rowIndex <= range.endRowIndex; rowIndex += 1) {
      const cell = tableBlock.rows[rowIndex]?.cells[range.cellIndex];
      if (!cell || cell.vMerge === "continue" || cell.blocks.length !== 1) {
        return false;
      }
    }

    return true;
  };

  const canMergeSelectedTable = (current: Editor2State): boolean => {
    return canMergeSelectedTableCells(current) || canMergeSelectedTableRows(current);
  };

  const canSplitSelectedTableCellVertically = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return false;
    }

    const blocks = getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    const cell = block.rows[location.rowIndex]?.cells[location.cellIndex];
    return Boolean((cell?.rowSpan ?? 1) > 1 && cell?.vMerge === "restart");
  };

  const canSplitSelectedTable = (current: Editor2State): boolean => {
    return canSplitSelectedTableCell(current) || canSplitSelectedTableCellVertically(current);
  };

  const updateBlocksInCurrentSection = (
    current: Editor2State,
    blocks: Editor2BlockNode[],
    zone: Editor2EditingZone = "main",
  ): Editor2State => {
    const activeSectionIndex = getActiveSectionIndex(current);
    const hasSections = current.document.sections && current.document.sections.length > 0;

    if (hasSections) {
      const nextSections = [...current.document.sections!];
      const section = nextSections[activeSectionIndex];
      if (zone === "header") {
        nextSections[activeSectionIndex] = { ...section, header: blocks };
      } else if (zone === "footer") {
        nextSections[activeSectionIndex] = { ...section, footer: blocks };
      } else {
        nextSections[activeSectionIndex] = { ...section, blocks: blocks };
      }
      return {
        ...current,
        document: {
          ...current.document,
          sections: nextSections,
        },
      };
    }

    return {
      ...current,
      document: {
        ...current.document,
        blocks,
      },
    };
  };

  const mergeSelectedTableCells = (current: Editor2State): Editor2State => {
    const range = resolveHorizontalTableCellRange(current);
    if (!range) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, range.zone).map(cloneBlock);
    const tableBlock = targetBlocks[range.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const row = tableBlock.rows[range.rowIndex];
    if (!row) {
      return current;
    }

    const selectedCells = row.cells.slice(range.startCellIndex, range.endCellIndex + 1);
    if (selectedCells.length < 2) {
      return current;
    }

    const mergedCell = {
      ...selectedCells[0]!,
      colSpan: selectedCells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan ?? 1), 0),
      blocks: selectedCells.flatMap((cell: any) => cell.blocks.map((paragraph: any) => cloneBlock(paragraph))) as Editor2ParagraphNode[],
    };

    row.cells.splice(range.startCellIndex, selectedCells.length, mergedCell);

    const nextParagraph = mergedCell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    const nextState = updateBlocksInCurrentSection(current, targetBlocks, range.zone);
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const mergeSelectedTableRows = (current: Editor2State): Editor2State => {
    const range = resolveVerticalTableCellRange(current);
    if (!range) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, range.zone).map(cloneBlock);
    const tableBlock = targetBlocks[range.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const selectedCells: Array<NonNullable<typeof tableBlock.rows[number]["cells"][number]>> = [];
    for (let rowIndex = range.startRowIndex; rowIndex <= range.endRowIndex; rowIndex += 1) {
      const row = tableBlock.rows[rowIndex];
      const cell = row?.cells[range.cellIndex];
      if (!row || !cell || cell.vMerge === "continue" || cell.blocks.length !== 1) {
        return current;
      }
      selectedCells.push(cell);
    }

    if (selectedCells.length < 2) {
      return current;
    }

    const mergedColSpan = Math.max(1, selectedCells[0]!.colSpan ?? 1);
    if (!selectedCells.every((cell) => Math.max(1, cell.colSpan ?? 1) === mergedColSpan)) {
      return current;
    }

    const mergedCell = {
      ...selectedCells[0]!,
      rowSpan: selectedCells.length,
      vMerge: "restart" as const,
      blocks: selectedCells.flatMap((cell: any) =>
        cell.blocks.map((paragraph: any) => cloneBlock(paragraph)),
      ) as Editor2ParagraphNode[],
    };
    tableBlock.rows[range.startRowIndex]!.cells[range.cellIndex] = mergedCell;

    for (let rowIndex = range.startRowIndex + 1; rowIndex <= range.endRowIndex; rowIndex += 1) {
      const placeholder = createEditor2TableCell([createEditor2Paragraph("")], mergedColSpan);
      placeholder.blocks = [];
      placeholder.vMerge = "continue";
      tableBlock.rows[rowIndex]!.cells[range.cellIndex] = placeholder;
    }

    const nextParagraph = mergedCell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    const nextState = updateBlocksInCurrentSection(current, targetBlocks, range.zone);
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const mergeSelectedTable = (current: Editor2State): Editor2State => {
    if (canMergeSelectedTableCells(current)) {
      return mergeSelectedTableCells(current);
    }

    if (canMergeSelectedTableRows(current)) {
      return mergeSelectedTableRows(current);
    }

    return current;
  };

  const splitSelectedTableCellVertically = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, location.zone).map(cloneBlock);
    const tableBlock = targetBlocks[location.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

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
      const replacement = createEditor2TableCell([createEditor2Paragraph("")], preservedColSpan);
      row.cells[location.cellIndex] = replacement;
    }

    const nextParagraph = cell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const splitSelectedTableCell = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, location.zone).map(cloneBlock);
    const tableBlock = targetBlocks[location.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

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
        blocks: cell.blocks.map((paragraph: any) => cloneBlock(paragraph)) as Editor2ParagraphNode[],
      },
      ...Array.from({ length: span - 1 }, () => createEditor2TableCell([createEditor2Paragraph("")])),
    ];

    row.cells.splice(location.cellIndex, 1, ...nextCells);

    const nextParagraph = nextCells[0]?.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const splitSelectedTable = (current: Editor2State): Editor2State => {
    if (canSplitSelectedTableCellVertically(current)) {
      return splitSelectedTableCellVertically(current);
    }

    if (canSplitSelectedTableCell(current)) {
      return splitSelectedTableCell(current);
    }

    return current;
  };

  const getRowVisualWidth = (row: Editor2TableRowNode): number =>
    row.cells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan ?? 1), 0);

  const getTableVisualWidth = (table: Editor2TableNode): number =>
    table.rows.reduce((max, row) => Math.max(max, getRowVisualWidth(row)), 0);

  const findCellAtVisualColumn = (
    row: Editor2TableRowNode,
    visualColumn: number,
  ): Editor2TableCellNode | null => {
    let visualCursor = 0;
    for (const cell of row.cells) {
      const span = Math.max(1, cell.colSpan ?? 1);
      if (visualColumn >= visualCursor && visualColumn < visualCursor + span) {
        return cell;
      }
      visualCursor += span;
    }

    return null;
  };

  const findFirstNavigableParagraphInTable = (table: Editor2TableNode): Editor2ParagraphNode | null => {
    for (const row of table.rows) {
      for (const cell of row.cells) {
        if (cell.vMerge === "continue") {
          continue;
        }
        const paragraph = cell.blocks[0];
        if (paragraph) {
          return paragraph;
        }
      }
    }

    return null;
  };

  const canEditSelectedTableRow = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return false;
    }

    const blocks = getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    return Boolean(block && block.type === "table");
  };

  const canEditSelectedTableColumn = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return false;
    }

    const blocks = getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    return getTableVisualWidth(block) > 1;
  };

  const insertSelectedTableRow = (current: Editor2State, direction: -1 | 1): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, location.zone).map(cloneBlock);
    const tableBlock = targetBlocks[location.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const sourceRow = tableBlock.rows[location.rowIndex];
    if (!sourceRow) {
      return current;
    }

    const insertIndex = Math.max(
      0,
      Math.min(tableBlock.rows.length, location.rowIndex + (direction > 0 ? 1 : 0)),
    );

    const hasVerticalSpansInTable = tableBlock.rows.some((row) =>
      row.cells.some((cell) => Math.max(1, cell.rowSpan ?? 1) > 1 || cell.vMerge !== undefined),
    );

    let blankRow: Editor2TableRowNode;
    if (hasVerticalSpansInTable) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (layoutEntry) =>
          layoutEntry.rowIndex === location.rowIndex && layoutEntry.cellIndex === location.cellIndex,
      );
      const sourceEntries = tableLayout.filter((layoutEntry) => layoutEntry.rowIndex === location.rowIndex);
      const templateEntries =
        sourceEntries.length > 0
          ? sourceEntries
          : tableLayout.filter((layoutEntry) => layoutEntry.rowIndex === Math.max(0, location.rowIndex - 1));
      blankRow = createEditor2TableRow(
        templateEntries.map((layoutEntry) => {
          const spanningEntry = tableLayout.find(
            (candidate) =>
              candidate.visualColumnIndex === layoutEntry.visualColumnIndex &&
              candidate.visualRowIndex < insertIndex &&
              candidate.visualRowIndex + candidate.rowSpan > insertIndex,
          );
          if (spanningEntry) {
            spanningEntry.cell.rowSpan = Math.max(1, spanningEntry.cell.rowSpan ?? 1) + 1;
            spanningEntry.cell.vMerge = "restart";
            const placeholder = createEditor2TableCell(
              [createEditor2Paragraph("")],
              layoutEntry.colSpan,
            );
            placeholder.blocks = [];
            placeholder.vMerge = "continue";
            return placeholder;
          }

          return createEditor2TableCell([createEditor2Paragraph("")], layoutEntry.colSpan);
        }),
      );
      tableBlock.rows.splice(insertIndex, 0, blankRow);

      const targetVisualColumn = selectedEntry?.visualColumnIndex ?? location.cellIndex;
      const targetCell = findCellAtVisualColumn(blankRow, targetVisualColumn);
      const nextParagraph =
        targetCell?.blocks[0] ??
        blankRow.cells.find((cell) => cell.vMerge !== "continue" && cell.blocks[0])?.blocks[0] ??
        findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
      }

      const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
      return {
        ...nextState,
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    } else {
      blankRow = createEditor2TableRow(
        sourceRow.cells.map((cell) =>
          createEditor2TableCell(
            [createEditor2Paragraph("")],
            Math.max(1, cell.colSpan ?? 1),
          ),
        ),
      );
      tableBlock.rows.splice(insertIndex, 0, blankRow);

      const targetCell = blankRow.cells[Math.min(location.cellIndex, blankRow.cells.length - 1)];
      const nextParagraph =
        targetCell?.blocks[0] ??
        blankRow.cells.find((cell) => cell.vMerge !== "continue" && cell.blocks[0])?.blocks[0] ??
        findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
      }

      const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
      return {
        ...nextState,
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    }
  };

  const deleteSelectedTableRow = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, location.zone).map(cloneBlock);
    const tableBlock = targetBlocks[location.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    if (tableBlock.rows.length <= 1) {
      return current;
    }

    const rowToDelete = tableBlock.rows[location.rowIndex];
    if (!rowToDelete) {
      return current;
    }

    const blockedByRestartCell = rowToDelete.cells.some(
      (cell) => cell.vMerge !== "continue" && Math.max(1, cell.rowSpan ?? 1) > 1,
    );
    if (blockedByRestartCell) {
      return current;
    }

    const hasVerticalSpansInTable = tableBlock.rows.some((row) =>
      row.cells.some((cell) => Math.max(1, cell.rowSpan ?? 1) > 1 || cell.vMerge !== undefined),
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

    const nextRow = tableBlock.rows[Math.min(location.rowIndex, tableBlock.rows.length - 1)];
    const targetCell = nextRow
      ? findCellAtVisualColumn(
          nextRow,
          Math.min(
            selectedEntry?.visualColumnIndex ?? location.cellIndex,
            Math.max(0, getRowVisualWidth(nextRow) - 1),
          ),
        )
      : null;
    const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const insertSelectedTableColumn = (current: Editor2State, direction: -1 | 1): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, location.zone).map(cloneBlock);
    const tableBlock = targetBlocks[location.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const hasHorizontalSpansInTable = tableBlock.rows.some((row) => row.cells.some((cell) => Math.max(1, cell.colSpan ?? 1) > 1));

    if (hasHorizontalSpansInTable) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (entry) =>
          entry.rowIndex === location.rowIndex && entry.cellIndex === location.cellIndex,
      );
      const insertVisualColumn =
        (selectedEntry?.visualColumnIndex ?? location.cellIndex) +
        (direction > 0 ? Math.max(1, selectedEntry?.colSpan ?? 1) : 0);

      for (const row of tableBlock.rows) {
        const nextCells: Editor2TableCellNode[] = [];
        let visualCursor = 0;
        let inserted = false;

        for (const cell of row.cells) {
          const span = Math.max(1, cell.colSpan ?? 1);
          if (!inserted && insertVisualColumn <= visualCursor) {
            nextCells.push(createEditor2TableCell([createEditor2Paragraph("")]));
            inserted = true;
          }

          if (!inserted && visualCursor < insertVisualColumn && insertVisualColumn < visualCursor + span) {
            nextCells.push({
              ...cell,
              colSpan: span + 1,
            });
            inserted = true;
          } else {
            nextCells.push(cell);
          }

          visualCursor += span;
        }

        if (!inserted) {
          nextCells.push(createEditor2TableCell([createEditor2Paragraph("")]));
        }

        row.cells = nextCells;
      }

      const targetRow = tableBlock.rows[location.rowIndex];
      const targetCell = targetRow ? findCellAtVisualColumn(targetRow, insertVisualColumn) : null;
      const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
      }

      const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
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
      Math.min(tableBlock.rows[0]?.cells.length ?? 0, location.cellIndex + (direction > 0 ? 1 : 0)),
    );

    for (const row of tableBlock.rows) {
      row.cells.splice(
        insertIndex,
        0,
        createEditor2TableCell([createEditor2Paragraph("")]),
      );
    }

    const targetRow = tableBlock.rows[location.rowIndex];
    const targetCell = targetRow?.cells[insertIndex];
    const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const deleteSelectedTableColumn = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId, getActiveSectionIndex(current));
    if (!location) {
      return current;
    }

    const targetBlocks = getTargetBlocks(current, location.zone).map(cloneBlock);
    const tableBlock = targetBlocks[location.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    if (getTableVisualWidth(tableBlock) <= 1) {
      return current;
    }

    const hasHorizontalSpansInTable = tableBlock.rows.some((row) => row.cells.some((cell) => Math.max(1, cell.colSpan ?? 1) > 1));

    if (hasHorizontalSpansInTable) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (entry) =>
          entry.rowIndex === location.rowIndex && entry.cellIndex === location.cellIndex,
      );
      const deleteVisualColumn = selectedEntry?.visualColumnIndex ?? location.cellIndex;

      for (const row of tableBlock.rows) {
        const nextCells: Editor2TableCellNode[] = [];
        let visualCursor = 0;

        for (const cell of row.cells) {
          const span = Math.max(1, cell.colSpan ?? 1);
          if (deleteVisualColumn >= visualCursor && deleteVisualColumn < visualCursor + span) {
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
          Math.min(deleteVisualColumn, Math.max(0, getRowVisualWidth(targetRow) - 1)),
        );
      const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
      }

      const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
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
    const targetCell = targetRow?.cells[Math.min(location.cellIndex, targetRow.cells.length - 1)];
    const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    }

    const nextState = updateBlocksInCurrentSection(current, targetBlocks, location.zone);
    return {
      ...nextState,
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const resolveAdjacentTableCellPosition = (
    document: Editor2Document,
    paragraphId: string,
    delta: -1 | 1,
  ): Editor2Position | null => {
    // Search all potential blocks
    const sections = getDocumentSections(document);
    for (const section of sections) {
      const allBlocks = [
        ...(section.header || []),
        ...section.blocks,
        ...(section.footer || []),
      ];

      for (const block of allBlocks) {
        if (block.type !== "table") {
          continue;
        }

        const cells = block.rows.flatMap((row) =>
          row.cells.filter((cell) => cell.vMerge !== "continue" && cell.blocks.length > 0),
        );
        const currentCellIndex = cells.findIndex((cell) =>
          cell.blocks.some((paragraph) => paragraph.id === paragraphId),
        );
        if (currentCellIndex === -1) {
          continue;
        }

        const nextCell = cells[currentCellIndex + delta];
        if (!nextCell) {
          return null;
        }

        const targetParagraph = nextCell.blocks[0];
        if (!targetParagraph) {
          return null;
        }

        return paragraphOffsetToPosition(targetParagraph, 0);
      }
    }

    return null;
  };

  const applyTableAwareParagraphEdit = (
    current: Editor2State,
    edit: (tempState: Editor2State) => Editor2State,
  ): Editor2State => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location || current.selection.anchor.paragraphId !== current.selection.focus.paragraphId) {
      return edit(current);
    }

    const activeSectionIndex = getActiveSectionIndex(current);
    const hasSections = current.document.sections && current.document.sections.length > 0;
    const section = hasSections ? current.document.sections![activeSectionIndex] : null;

    const zone = location.zone;
    let targetBlocks: Editor2BlockNode[] = [];
    if (section) {
      if (zone === "header") targetBlocks = section.header || [];
      else if (zone === "footer") targetBlocks = section.footer || [];
      else targetBlocks = section.blocks;
    } else {
      targetBlocks = current.document.blocks;
    }

    const nextBlocks = targetBlocks.map(cloneBlock);
    const tableBlock = nextBlocks[location.blockIndex] as Editor2TableNode;
    if (!tableBlock || tableBlock.type !== "table") {
      return edit(current);
    }

    const targetCell = tableBlock.rows[location.rowIndex]?.cells[location.cellIndex];
    if (!targetCell) {
      return edit(current);
    }

    const tempState: Editor2State = {
      ...current,
      document: createEditor2Document(targetCell.blocks),
      selection: {
        anchor: { ...current.selection.anchor },
        focus: { ...current.selection.focus },
      },
    };
    const tempResult = edit(tempState);
    const replacementParagraphs = tempResult.document.blocks.filter(
      (block): block is Editor2ParagraphNode => block.type === "paragraph",
    );

    targetCell.blocks.splice(0, targetCell.blocks.length, ...replacementParagraphs);

    const nextState = updateBlocksInCurrentSection(current, nextBlocks, zone);
    return {
      ...nextState,
      selection: tempResult.selection,
    };
  };

  const withExpandedTableCellSelection = (current: Editor2State): Editor2State => {
    const expandedSelection = resolveTableCellRangeSelection(current);
    if (!expandedSelection) {
      return current;
    }

    return deps.applySelectionToStatePreservingStructure(current, expandedSelection);
  };

  const applySelectionAwareCommand = (
    command: (current: Editor2State) => Editor2State,
    logPrefix: string,
  ) => {
    deps.applyTransactionalState((current) => {
      const selection = resolveSelectedTableCells(current);
      if (!selection || selection.cells.length <= 1) {
        const expanded = withExpandedTableCellSelection(current);
        if (expanded !== current) {
          deps.logger?.info(
            `${logPrefix}: expanded selection to ${expanded.selection.anchor.paragraphId}[${expanded.selection.anchor.offset}]..${expanded.selection.focus.paragraphId}[${expanded.selection.focus.offset}]`,
          );
        }
        return command(expanded);
      }

      const { blockIndex, cells, zone } = selection;

      deps.logger?.info(
        `${logPrefix}: multi-cell selection in table block ${blockIndex} (${cells.length} cells) in zone ${zone}`,
      );

      // 1. Collect all paragraphs from all selected cells
      const allParagraphs: Editor2ParagraphNode[] = [];
      const cellParagraphCounts: number[] = [];
      for (const entry of cells) {
        allParagraphs.push(...entry.cell.blocks);
        cellParagraphCounts.push(entry.cell.blocks.length);
      }

      if (allParagraphs.length === 0) {
        return current;
      }

      // 2. Create temp state with these paragraphs
      const tempState: Editor2State = {
        ...current,
        document: createEditor2Document(allParagraphs),
        selection: {
          anchor: paragraphOffsetToPosition(allParagraphs[0], 0),
          focus: paragraphOffsetToPosition(
            allParagraphs[allParagraphs.length - 1],
            getParagraphText(allParagraphs[allParagraphs.length - 1]).length,
          ),
        },
      };

      // 3. Apply command
      const tempResult = command(tempState);
      const resultParagraphs = getParagraphs(tempResult);

      // 4. Distribute paragraphs back to cells
      const targetBlocks = getTargetBlocks(current, zone).map(cloneBlock);
      const tableBlock = targetBlocks[blockIndex] as Editor2TableNode;
      if (!tableBlock) {
        return current;
      }

      let pIdx = 0;
      for (let i = 0; i < cells.length; i += 1) {
        const entry = cells[i];
        const count = cellParagraphCounts[i];
        const cellParagraphs = resultParagraphs.slice(pIdx, pIdx + count);
        pIdx += count;

        const targetCell = tableBlock.rows[entry.rowIndex]?.cells[entry.cellIndex];
        if (targetCell) {
          targetCell.blocks = cellParagraphs;
        }
      }

      return updateBlocksInCurrentSection(current, targetBlocks, zone);
    });
  };

  const applySelectionAwareTextCommand = (command: (current: Editor2State) => Editor2State) => {
    applySelectionAwareCommand(command, "applySelectionAwareTextCommand");
  };

  const applySelectionAwareParagraphCommand = (command: (current: Editor2State) => Editor2State) => {
    applySelectionAwareCommand(command, "applySelectionAwareParagraphCommand");
  };

  const insertTableCommand = (rows: number, cols: number) => {
    deps.logger?.info(`insertTableCommand: ${rows}x${cols}`);
    deps.applyTransactionalState((current) => insertTableAtSelection(current, rows, cols), {
      mergeKey: "insertTable",
    });
    deps.focusInput();
  };

  const tableSelectionLabel = (): string | null => {
    return null;
  };

  const isInsideTable = (): boolean => {
    return false;
  };

  const tableActionRestrictionLabel = (): string | null => {
    return null;
  };

  return {
    resolveTableCellRangeSelection,
    resolveHorizontalTableCellRange,
    resolveVerticalTableCellRange,
    canMergeSelectedTableCells,
    canSplitSelectedTableCell,
    canMergeSelectedTableRows,
    canMergeSelectedTable,
    canSplitSelectedTableCellVertically,
    canSplitSelectedTable,
    canEditSelectedTableRow,
    canEditSelectedTableColumn,
    mergeSelectedTableCells,
    mergeSelectedTableRows,
    mergeSelectedTable,
    splitSelectedTableCellVertically,
    splitSelectedTableCell,
    splitSelectedTable,
    insertSelectedTableRow,
    deleteSelectedTableRow,
    insertSelectedTableColumn,
    deleteSelectedTableColumn,
    getRowVisualWidth,
    getTableVisualWidth,
    findCellAtVisualColumn,
    findFirstNavigableParagraphInTable,
    updateBlocksInCurrentSection,
    resolveAdjacentTableCellPosition,
    applyTableAwareParagraphEdit,
    withExpandedTableCellSelection,
    applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand,
    insertTableCommand,
    tableSelectionLabel,
    isInsideTable,
    tableActionRestrictionLabel,
  };
}

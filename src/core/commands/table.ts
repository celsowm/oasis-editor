import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorState,
  EditorTableCellStyle,
  EditorBorderStyle,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableStyle,
  EditorTableRowStyle,
} from "../model.js";
import {
  getBlockParagraphs,
  getDocumentSections,
  getParagraphs,
  paragraphOffsetToPosition,
  getActiveSectionIndex,
  getActiveZone,
  findParagraphTableLocation,
} from "../model.js";
import {
  createEditorParagraph,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "../editorState.js";
import { clampPosition, normalizeSelection } from "../selection.js";
import { buildTableCellLayout } from "../tableLayout.js";
import { updateTableCellsInBlocks, withSelection } from "./utils.js";

export function setTableCellStyleValue<K extends keyof EditorTableCellStyle>(
  state: EditorState,
  key: K,
  value: EditorTableCellStyle[K] | null,
): EditorState {
  const selectedParagraphIds = new Set<string>();
  const activeSectionIndex = getActiveSectionIndex(state);
  const anchorLoc = findParagraphTableLocation(
    state.document,
    state.selection.anchor.paragraphId,
    activeSectionIndex,
  );
  const focusLoc = findParagraphTableLocation(
    state.document,
    state.selection.focus.paragraphId,
    activeSectionIndex,
  );

  if (
    anchorLoc &&
    focusLoc &&
    anchorLoc.blockIndex === focusLoc.blockIndex &&
    anchorLoc.zone === focusLoc.zone
  ) {
    // Table-aware selection: identify all cells in the rectangular range
    const sections = getDocumentSections(state.document);
    const section = sections[activeSectionIndex];
    if (section) {
      const blocks =
        anchorLoc.zone === "header"
          ? section.header
          : anchorLoc.zone === "footer"
            ? section.footer
            : section.blocks;
      const tableBlock = blocks?.[anchorLoc.blockIndex];
      if (tableBlock && tableBlock.type === "table") {
        const tableLayout = buildTableCellLayout(tableBlock);
        const anchorCell = tableLayout.find(
          (e) =>
            e.rowIndex === anchorLoc.rowIndex &&
            e.cellIndex === anchorLoc.cellIndex,
        );
        const focusCell = tableLayout.find(
          (e) =>
            e.rowIndex === focusLoc.rowIndex &&
            e.cellIndex === focusLoc.cellIndex,
        );

        if (anchorCell && focusCell) {
          const startRow = Math.min(
            anchorCell.visualRowIndex,
            focusCell.visualRowIndex,
          );
          const endRow = Math.max(
            anchorCell.visualRowIndex + anchorCell.rowSpan - 1,
            focusCell.visualRowIndex + focusCell.rowSpan - 1,
          );
          const startCol = Math.min(
            anchorCell.visualColumnIndex,
            focusCell.visualColumnIndex,
          );
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

          for (const entry of cells) {
            for (const p of entry.cell.blocks) {
              selectedParagraphIds.add(p.id);
            }
          }
        }
      }
    }
  }

  // Fallback to linear selection if not a table-specific selection or if table lookup failed
  if (selectedParagraphIds.size === 0) {
    const normalized = normalizeSelection(state);
    const paragraphs = getParagraphs(state);
    for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
      selectedParagraphIds.add(paragraphs[i].id);
    }
  }

  const updateCell = (cell: EditorTableCellNode): EditorTableCellNode => {
    const nextStyle = { ...(cell.style ?? {}) } as Record<string, unknown>;
    if (value === null) {
      delete nextStyle[key];
    } else {
      nextStyle[key] = value;
    }
    return {
      ...cell,
      style:
        Object.keys(nextStyle).length > 0
          ? (nextStyle as EditorTableCellStyle)
          : undefined,
    };
  };

  const sections = getDocumentSections(state.document);
  const nextSections = sections.map((section) => ({
    ...section,
    blocks: updateTableCellsInBlocks(
      section.blocks,
      selectedParagraphIds,
      updateCell,
    ),
    header: section.header
      ? updateTableCellsInBlocks(
          section.header,
          selectedParagraphIds,
          updateCell,
        )
      : undefined,
    footer: section.footer
      ? updateTableCellsInBlocks(
          section.footer,
          selectedParagraphIds,
          updateCell,
        )
      : undefined,
  }));
  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function setTableStyleValue<K extends keyof EditorTableStyle>(
  state: EditorState,
  key: K,
  value: EditorTableStyle[K] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const selectedParagraphIds = new Set<string>();

  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    selectedParagraphIds.add(paragraphs[i].id);
  }

  const updateTable = (table: EditorTableNode): EditorTableNode => {
    const nextStyle = { ...(table.style ?? {}) } as Record<string, unknown>;
    if (value === null) {
      delete nextStyle[key];
    } else {
      nextStyle[key] = value;
    }
    return {
      ...table,
      style:
        Object.keys(nextStyle).length > 0
          ? (nextStyle as EditorTableStyle)
          : undefined,
    };
  };

  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    return blocks.map((block) => {
      if (block.type === "paragraph") return block;

      const paragraphsInTable = getBlockParagraphs(block);
      const isSelected = paragraphsInTable.some((p) =>
        selectedParagraphIds.has(p.id),
      );

      const updatedRows = block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: updateBlocks(cell.blocks) as EditorParagraphNode[],
        })),
      }));

      const nextTable = { ...block, rows: updatedRows };
      return isSelected ? updateTable(nextTable) : nextTable;
    });
  };

  const sections = getDocumentSections(state.document);
  const nextSections = sections.map((section) => ({
    ...section,
    blocks: updateBlocks(section.blocks),
    header: section.header ? updateBlocks(section.header) : undefined,
    footer: section.footer ? updateBlocks(section.footer) : undefined,
  }));
  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function setTableCellWidth(
  state: EditorState,
  width: number | string | null,
): EditorState {
  return setTableCellStyleValue(state, "width", width);
}

export function setTableRowHeight(
  state: EditorState,
  tableId: string,
  rowIndex: number,
  height: number | string | null,
): EditorState {
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;
    const nextRows = [...table.rows];
    const row = nextRows[rowIndex];
    if (row) {
      const nextStyle = { ...(row.style ?? {}) } as Record<string, unknown>;
      if (height === null) {
        delete nextStyle.height;
      } else {
        nextStyle.height = height;
      }
      nextRows[rowIndex] = {
        ...row,
        style:
          Object.keys(nextStyle).length > 0
            ? (nextStyle as EditorTableRowStyle)
            : undefined,
      };
    }
    return { ...table, rows: nextRows };
  };

  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    return blocks.map((block) => {
      if (block.type === "table") {
        return updateTable(block);
      }
      return block;
    });
  };

  const nextSections = getDocumentSections(state.document).map((section) => ({
    ...section,
    blocks: updateBlocks(section.blocks),
    header: section.header ? updateBlocks(section.header) : undefined,
    footer: section.footer ? updateBlocks(section.footer) : undefined,
  }));
  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function setTableColumnWidths(
  state: EditorState,
  tableId: string,
  columnWidths: Record<number, number | string>, // visualColumnIndex -> width
  tableWidth?: number | string,
  tableIndentLeft?: number | string,
): EditorState {
  const parseWidthToPt = (
    value: number | string | undefined,
  ): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || trimmed.includes("%")) {
      return null;
    }
    if (trimmed.endsWith("pt")) {
      const parsed = Number.parseFloat(trimmed.slice(0, -2));
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (trimmed.endsWith("px")) {
      const parsed = Number.parseFloat(trimmed.slice(0, -2));
      return Number.isFinite(parsed) ? parsed * (72 / 96) : null;
    }
    if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;

    const tableLayout = buildTableCellLayout(table);
    const visualColumnCount = Math.max(
      1,
      ...tableLayout.map(
        (entry) => entry.visualColumnIndex + Math.max(1, entry.colSpan),
      ),
    );
    const nextGridCols = Array<number>(visualColumnCount);
    let hasGridOverride = false;
    let canResolveGrid = true;
    for (
      let columnIndex = 0;
      columnIndex < visualColumnCount;
      columnIndex += 1
    ) {
      const override = parseWidthToPt(columnWidths[columnIndex]);
      if (override !== null) {
        nextGridCols[columnIndex] = Math.max(1, override);
        hasGridOverride = true;
        continue;
      }
      const existing = table.gridCols?.[columnIndex];
      if (
        typeof existing === "number" &&
        Number.isFinite(existing) &&
        existing > 0
      ) {
        nextGridCols[columnIndex] = existing;
        continue;
      }
      canResolveGrid = false;
      break;
    }

    const nextRows = table.rows.map((row, rowIndex) => {
      const nextCells = row.cells.map((cell, cellIndex) => {
        const entry = tableLayout.find(
          (e) => e.rowIndex === rowIndex && e.cellIndex === cellIndex,
        );
        if (!entry) return cell;

        const rightVisualColumnIndex =
          entry.visualColumnIndex + entry.colSpan - 1;
        const newWidth = columnWidths[rightVisualColumnIndex];

        if (newWidth !== undefined) {
          if (entry.colSpan === 1) {
            return {
              ...cell,
              style: {
                ...(cell.style ?? {}),
                width: typeof newWidth === "number" ? newWidth : newWidth,
              },
            };
          }
        }

        return cell;
      });
      return { ...row, cells: nextCells };
    });

    const nextStyle = { ...(table.style ?? {}) } as any;
    if (tableWidth !== undefined) {
      nextStyle.width = tableWidth;
    }
    if (tableIndentLeft !== undefined) {
      nextStyle.indentLeft = tableIndentLeft;
    }

    return {
      ...table,
      rows: nextRows,
      gridCols:
        hasGridOverride && canResolveGrid ? nextGridCols : table.gridCols,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : undefined,
    };
  };
  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    return blocks.map((block) => {
      if (block.type === "table") {
        return updateTable(block);
      }
      return block;
    });
  };

  const nextSections = getDocumentSections(state.document).map((section) => ({
    ...section,
    blocks: updateBlocks(section.blocks),
    header: section.header ? updateBlocks(section.header) : undefined,
    footer: section.footer ? updateBlocks(section.footer) : undefined,
  }));
  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function setTableCellBorders(
  state: EditorState,
  border: EditorBorderStyle | null,
): EditorState {
  let nextState = setTableCellStyleValue(state, "borderTop", border);
  nextState = setTableCellStyleValue(nextState, "borderRight", border);
  nextState = setTableCellStyleValue(nextState, "borderBottom", border);
  nextState = setTableCellStyleValue(nextState, "borderLeft", border);
  return nextState;
}

export function insertTableAtSelection(
  state: EditorState,
  rows: number,
  cols: number,
): EditorState {
  const initialCellWidth = `${100 / Math.max(1, cols)}%`;
  const tableRows = [];
  for (let r = 0; r < rows; r += 1) {
    const cells = [];
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        ...createEditorTableCell([createEditorParagraph("")]),
        style: {
          width: initialCellWidth,
        },
      });
    }
    tableRows.push(createEditorTableRow(cells));
  }
  const table = {
    ...createEditorTable(tableRows),
    style: {
      width: "100%",
    },
  };

  const focus = clampPosition(state, state.selection.focus);
  const sections = getDocumentSections(state.document);
  const activeSectionIndex = getActiveSectionIndex(state);
  const zone = getActiveZone(state);

  const insertIntoBlocks = (
    blocks: EditorBlockNode[],
  ): { nextBlocks: EditorBlockNode[]; found: boolean } => {
    const blockIndex = blocks.findIndex((b) => {
      if (b.id === focus.paragraphId) return true;
      if (b.type === "paragraph") return false;
      return getBlockParagraphs(b).some((p) => p.id === focus.paragraphId);
    });

    if (blockIndex === -1) {
      return { nextBlocks: blocks, found: false };
    }

    return {
      nextBlocks: [
        ...blocks.slice(0, blockIndex + 1),
        table,
        ...blocks.slice(blockIndex + 1),
      ],
      found: true,
    };
  };

  const section = sections[activeSectionIndex];
  if (!section) return state;

  const nextSection = { ...section };
  let found = false;

  if (zone === "header") {
    const result = insertIntoBlocks(section.header ?? []);
    nextSection.header = result.nextBlocks;
    found = result.found;
  } else if (zone === "footer") {
    const result = insertIntoBlocks(section.footer ?? []);
    nextSection.footer = result.nextBlocks;
    found = result.found;
  } else {
    const result = insertIntoBlocks(section.blocks);
    nextSection.blocks = result.nextBlocks;
    found = result.found;
  }

  if (!found) return state;

  const nextSections = [...sections];
  nextSections[activeSectionIndex] = nextSection;

  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
    selection: withSelection(
      paragraphOffsetToPosition(table.rows[0]!.cells[0]!.blocks[0]!, 0),
    ),
  };
}

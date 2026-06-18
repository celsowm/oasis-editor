import { cloneBlock } from "@/core/cloneState.js";
import { createEditorDocument } from "@/core/editorState.js";
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";
import { updateBlocksInCurrentSection } from "./tableOpsMutationCommands.js";
import type { SelectedTableCells } from "./tableOpsSelectionRanges.js";

interface TableSelectionAwareCommandsDeps {
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  applySelectionToStatePreservingStructure: (
    current: EditorState,
    nextSelection: EditorState["selection"],
  ) => EditorState;
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[];
  resolveTableCellRangeSelection: (
    current: EditorState,
  ) => EditorState["selection"] | null;
  resolveSelectedTableCells: (
    current: EditorState,
  ) => SelectedTableCells | null;
  logger?: EditorLogger;
}

export function createTableSelectionAwareCommands(
  deps: TableSelectionAwareCommandsDeps,
) {
  const withExpandedTableCellSelection = (
    current: EditorState,
  ): EditorState => {
    const expandedSelection = deps.resolveTableCellRangeSelection(current);
    if (!expandedSelection) {
      return current;
    }

    return deps.applySelectionToStatePreservingStructure(
      current,
      expandedSelection,
    );
  };

  const applySelectionAwareCommand = (
    command: (current: EditorState) => EditorState,
    logPrefix: string,
  ) => {
    deps.applyTransactionalState((current) => {
      const selection = deps.resolveSelectedTableCells(current);
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

      const allParagraphs: EditorParagraphNode[] = [];
      const cellParagraphCounts: number[] = [];
      for (const entry of cells) {
        allParagraphs.push(...entry.cell.blocks);
        cellParagraphCounts.push(entry.cell.blocks.length);
      }

      if (allParagraphs.length === 0) {
        return current;
      }

      const tempState: EditorState = {
        ...current,
        document: createEditorDocument(
          allParagraphs,
          undefined,
          undefined,
          undefined,
          undefined,
          current.document.assets,
        ),
        selection: {
          anchor: paragraphOffsetToPosition(allParagraphs[0], 0),
          focus: paragraphOffsetToPosition(
            allParagraphs[allParagraphs.length - 1],
            getParagraphText(allParagraphs[allParagraphs.length - 1]).length,
          ),
        },
      };

      const tempResult = command(tempState);
      const resultParagraphs = getParagraphs(tempResult);
      const currentBlocks = deps.getTargetBlocks(current, zone);
      const originalTable = currentBlocks[blockIndex];
      if (!originalTable || originalTable.type !== "table") {
        return current;
      }
      const clonedTable = cloneBlock(originalTable) as EditorTableNode;
      const targetBlocks = [...currentBlocks];
      targetBlocks[blockIndex] = clonedTable;
      const tableBlock = clonedTable;

      let paragraphIndex = 0;
      for (let index = 0; index < cells.length; index += 1) {
        const entry = cells[index];
        const count = cellParagraphCounts[index];
        const cellParagraphs = resultParagraphs.slice(
          paragraphIndex,
          paragraphIndex + count,
        );
        paragraphIndex += count;

        const targetCell =
          tableBlock.rows[entry.rowIndex]?.cells[entry.cellIndex];
        if (targetCell) {
          targetCell.blocks = cellParagraphs;
        }
      }

      return updateBlocksInCurrentSection(current, targetBlocks, zone);
    });
  };

  const applySelectionAwareTextCommand = (
    command: (current: EditorState) => EditorState,
  ) => {
    applySelectionAwareCommand(command, "applySelectionAwareTextCommand");
  };

  const applySelectionAwareParagraphCommand = (
    command: (current: EditorState) => EditorState,
  ) => {
    applySelectionAwareCommand(command, "applySelectionAwareParagraphCommand");
  };

  return {
    withExpandedTableCellSelection,
    applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand,
  };
}

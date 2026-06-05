import type { EditorState, EditorBlockNode } from "../../core/model.js";
import {
  getEditableBlocksForZone,
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  getActiveSectionIndex,
  findParagraphTableLocation,
} from "../../core/model.js";
import {
  setSelection,
  moveSelectionLeft,
  moveSelectionRight,
} from "../../core/editorCommands.js";
import { isSelectionCollapsed } from "../../core/selection.js";
import {
  findPreviousWordBoundary,
  findNextWordBoundary,
} from "../../core/wordBoundaries.js";
import { buildTableCellLayout } from "../../core/tableLayout.js";
import { buildCanvasLayoutSnapshot } from "../../ui/canvas/CanvasLayoutSnapshot.js";
import { getParagraphEntries } from "../../ui/canvas/CanvasGeometry.js";
import type { CaretBox } from "../../ui/editorUiTypes.js";

export interface UseEditorNavigationProps {
  state: () => EditorState;
  applyState: (state: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
  ) => void;
  surfaceRef: () => HTMLDivElement | null;
  caretBox: () => CaretBox;
  preferredColumnX: () => number | null;
  setPreferredColumnX: (x: number | null) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInput: () => void;
}

export function createEditorNavigation(deps: UseEditorNavigationProps) {
  const moveSelectionToParagraphBoundary = (
    boundary: "start" | "end",
    extend: boolean,
  ) => {
    const state = deps.state();
    const targetParagraph = getParagraphs(state).find(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    if (!targetParagraph) {
      return false;
    }

    const targetOffset =
      boundary === "start" ? 0 : getParagraphText(targetParagraph).length;
    const targetPosition = paragraphOffsetToPosition(
      targetParagraph,
      targetOffset,
    );
    deps.clearPreferredColumn();
    deps.applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const moveSelectionToDocumentBoundary = (
    boundary: "start" | "end",
    extend: boolean,
  ) => {
    const state = deps.state();
    const paragraphs = getParagraphs(state);
    if (paragraphs.length === 0) {
      return false;
    }

    const targetParagraph =
      boundary === "start" ? paragraphs[0] : paragraphs[paragraphs.length - 1];
    const targetOffset =
      boundary === "start" ? 0 : getParagraphText(targetParagraph).length;
    const targetPosition = paragraphOffsetToPosition(
      targetParagraph,
      targetOffset,
    );
    deps.clearPreferredColumn();
    deps.applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const moveSelectionByWord = (
    direction: "left" | "right",
    extend: boolean,
  ) => {
    const state = deps.state();
    const paragraphs = getParagraphs(state);
    const focusParagraphIndex = paragraphs.findIndex(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    const focusParagraph = paragraphs[focusParagraphIndex];
    if (!focusParagraph) {
      return false;
    }

    const paragraphText = getParagraphText(focusParagraph);
    const focusOffset = state.selection.focus.offset;
    const paragraphLength = paragraphText.length;

    if (!extend && !isSelectionCollapsed(state.selection)) {
      deps.clearPreferredColumn();
      deps.applyState(
        direction === "left"
          ? moveSelectionLeft(state)
          : moveSelectionRight(state),
      );
      return true;
    }

    let targetParagraph = focusParagraph;
    let targetOffset = focusOffset;

    if (direction === "left") {
      if (focusOffset === 0 && focusParagraphIndex > 0) {
        targetParagraph = paragraphs[focusParagraphIndex - 1]!;
        targetOffset = getParagraphText(targetParagraph).length;
      } else {
        targetOffset = findPreviousWordBoundary(paragraphText, focusOffset);
      }
    } else {
      if (
        focusOffset === paragraphLength &&
        focusParagraphIndex < paragraphs.length - 1
      ) {
        targetParagraph = paragraphs[focusParagraphIndex + 1]!;
        targetOffset = 0;
      } else {
        targetOffset = findNextWordBoundary(paragraphText, focusOffset);
      }
    }

    const targetPosition = paragraphOffsetToPosition(
      targetParagraph,
      targetOffset,
    );
    deps.clearPreferredColumn();
    deps.applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const moveVerticalByBlock = (direction: -1 | 1) => {
    return moveVerticalSelection(direction, false);
  };

  const moveVerticalSelection = (direction: -1 | 1, extend: boolean) => {
    const state = deps.state();
    const paragraphs = getParagraphs(state);
    const currentIndex = paragraphs.findIndex(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    if (currentIndex === -1) {
      return false;
    }

    const surfaceRef = deps.surfaceRef();
    const surfaceRect = surfaceRef?.getBoundingClientRect() ?? null;
    const preferredX = deps.preferredColumnX();
    const desiredX =
      preferredX === null
        ? deps.caretBox().left + (surfaceRect?.left ?? 0)
        : preferredX;
    const snapshot = surfaceRef
      ? buildCanvasLayoutSnapshot({
          surface: surfaceRef,
          state,
          layoutMode: "wordParity",
        })
      : null;
    let targetIndex = currentIndex + direction;
    const tableLocation = findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      getActiveSectionIndex(state),
    );
    if (tableLocation) {
      const targetBlocks: EditorBlockNode[] = getEditableBlocksForZone(
        state,
        tableLocation.zone,
      );

      const block = targetBlocks[tableLocation.blockIndex];
      if (block && block.type === "table") {
        const tableLayout = buildTableCellLayout(block);
        const currentCell = tableLayout.find(
          (entry) =>
            entry.rowIndex === tableLocation.rowIndex &&
            entry.cellIndex === tableLocation.cellIndex,
        );
        if (currentCell) {
          const candidateRows: number[] = [];
          for (
            let rowIndex = currentCell.visualRowIndex + direction;
            rowIndex >= 0 && rowIndex < block.rows.length;
            rowIndex += direction
          ) {
            candidateRows.push(rowIndex);
          }

          for (const rowIndex of candidateRows) {
            const rowCandidates = tableLayout.filter(
              (entry) =>
                entry.visualRowIndex === rowIndex &&
                entry.cell.blocks.length > 0 &&
                entry.cell.vMerge !== "continue",
            );
            if (rowCandidates.length === 0) {
              continue;
            }

            const scoredCandidates = rowCandidates
              .map((entry) => {
                const paragraphId = entry.cell.blocks[0]?.id;
                const cellRect = paragraphId
                  ? snapshot?.paragraphs.find(
                      (paragraph) =>
                        paragraph.paragraphId === paragraphId &&
                        paragraph.tableCell &&
                        paragraph.tableCell.tableId === block.id,
                    )?.tableCell
                  : null;
                const left = cellRect?.left ?? desiredX;
                const right = cellRect
                  ? cellRect.left + cellRect.width
                  : desiredX;
                const distance =
                  desiredX < left
                    ? left - desiredX
                    : desiredX > right
                      ? desiredX - right
                      : 0;
                return { entry, distance };
              })
              .sort((left, right) => left.distance - right.distance);

            const candidate = scoredCandidates[0]?.entry;
            if (!candidate) {
              continue;
            }

            const targetId =
              direction < 0
                ? candidate.cell.blocks[candidate.cell.blocks.length - 1]!.id
                : candidate.cell.blocks[0]!.id;
            targetIndex = paragraphs.findIndex((p) => p.id === targetId);
            break;
          }
        } else {
          if (direction < 0) {
            const firstParaId = block.rows[0]?.cells[0]?.blocks[0]?.id;
            if (firstParaId) {
              targetIndex =
                paragraphs.findIndex((p) => p.id === firstParaId) - 1;
            }
          } else {
            const lastRow = block.rows[block.rows.length - 1];
            const lastCell = lastRow?.cells[lastRow.cells.length - 1];
            const lastParaId = lastCell?.blocks[lastCell.blocks.length - 1]?.id;
            if (lastParaId) {
              targetIndex =
                paragraphs.findIndex((p) => p.id === lastParaId) + 1;
            }
          }
        }
      }
    }

    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      return false;
    }

    const targetParagraph = paragraphs[targetIndex];
    let offset = 0;
    const targetEntries = snapshot
      ? getParagraphEntries(snapshot, targetParagraph.id)
      : [];
    const targetEntry =
      direction < 0
        ? targetEntries[targetEntries.length - 1]
        : targetEntries[0];
    if (targetEntry && targetEntry.lines.length > 0) {
      const lines = targetEntry.lines;
      const boundaryLine = direction < 0 ? lines[lines.length - 1]! : lines[0]!;
      offset = boundaryLine.slots.length
        ? boundaryLine.slots.reduce(
            (best, slot) =>
              Math.abs(desiredX - slot.left) < Math.abs(desiredX - best.left)
                ? slot
                : best,
            boundaryLine.slots[0]!,
          ).offset
        : 0;
    } else {
      offset = Math.min(
        positionToParagraphOffset(targetParagraph, state.selection.focus),
        getParagraphText(targetParagraph).length,
      );
    }

    deps.setPreferredColumnX(desiredX);
    deps.resetTransactionGrouping();
    deps.applyTransactionalState((current) =>
      setSelection(current, {
        anchor: extend
          ? current.selection.anchor
          : paragraphOffsetToPosition(targetParagraph, offset),
        focus: paragraphOffsetToPosition(targetParagraph, offset),
      }),
    );
    deps.focusInput();
    return true;
  };

  return {
    moveSelectionToParagraphBoundary,
    moveSelectionToDocumentBoundary,
    moveSelectionByWord,
    moveVerticalByBlock,
    moveVerticalSelection,
  };
}

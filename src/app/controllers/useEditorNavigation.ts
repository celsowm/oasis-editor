import type {
  EditorState,
  EditorParagraphNode,
  EditorBlockNode,
  EditorPosition,
} from "../../core/model.js";
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  getActiveSectionIndex,
  findParagraphTableLocation,
} from "../../core/model.js";
import { setSelection, moveSelectionLeft, moveSelectionRight } from "../../core/editorCommands.js";
import { isSelectionCollapsed } from "../../core/selection.js";
import {
  findPreviousWordBoundary,
  findNextWordBoundary,
} from "../../core/wordBoundaries.js";
import { buildTableCellLayout } from "../../core/tableLayout.js";
import { getParagraphBoundaryElement } from "../../ui/domGeometry.js";
import { collectParagraphCharRects } from "../../ui/positionAtPoint.js";
import { measureParagraphLayoutFromRects } from "../../ui/layoutProjection.js";
import type { CaretBox } from "../../ui/editorUiTypes.js";

export interface UseEditorNavigationProps {
  state: () => EditorState;
  applyState: (state: EditorState) => void;
  applyTransactionalState: (producer: (current: EditorState) => EditorState) => void;
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
    let targetIndex = currentIndex + direction;
    const tableLocation = findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      getActiveSectionIndex(state),
    );
    if (tableLocation) {
      const activeSectionIndex = getActiveSectionIndex(state);
      const hasSections = state.document.sections && state.document.sections.length > 0;
      const section = hasSections ? state.document.sections![activeSectionIndex] : null;

      let targetBlocks: EditorBlockNode[] = [];
      if (section) {
        if (tableLocation.zone === "header") targetBlocks = section.header || [];
        else if (tableLocation.zone === "footer") targetBlocks = section.footer || [];
        else targetBlocks = section.blocks;
      } else {
        targetBlocks = state.document.blocks;
      }

      const block = targetBlocks[tableLocation.blockIndex];
      if (block && block.type === "table") {
        const tableLayout = buildTableCellLayout(block);
        const currentCell = tableLayout.find(
          (entry) =>
            entry.rowIndex === tableLocation.rowIndex &&
            entry.cellIndex === tableLocation.cellIndex,
        );
        if (currentCell) {
          const currentElementCandidates = surfaceRef
            ? Array.from(
                surfaceRef.querySelectorAll<HTMLElement>(
                  `[data-source-block-id="${block.id}"] [data-row-index="${tableLocation.rowIndex}"][data-cell-index="${tableLocation.cellIndex}"], ` +
                    `[data-block-id="${block.id}"] [data-row-index="${tableLocation.rowIndex}"][data-cell-index="${tableLocation.cellIndex}"]`,
                ),
              )
            : [];
          const currentElement =
            currentElementCandidates.find(
              (element) =>
                element.closest('[data-repeated-header="true"]') === null,
            ) ?? currentElementCandidates[0];
          const desiredX =
            deps.preferredColumnX() ??
            (currentElement
              ? currentElement.getBoundingClientRect().left
              : deps.caretBox().left);
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
                const cellElementCandidates = surfaceRef
                  ? Array.from(
                      surfaceRef.querySelectorAll<HTMLElement>(
                        `[data-source-block-id="${block.id}"] [data-row-index="${entry.rowIndex}"][data-cell-index="${entry.cellIndex}"], ` +
                          `[data-block-id="${block.id}"] [data-row-index="${entry.rowIndex}"][data-cell-index="${entry.cellIndex}"]`,
                      ),
                    )
                  : [];
                const cellElement =
                  cellElementCandidates.find(
                    (element) =>
                      element.closest('[data-repeated-header="true"]') === null,
                  ) ?? cellElementCandidates[0];
                const rect = cellElement?.getBoundingClientRect();
                const left = rect?.left ?? desiredX;
                const right = rect?.right ?? desiredX;
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
    const targetElement = surfaceRef
      ? getParagraphBoundaryElement(
          surfaceRef,
          targetParagraph.id,
          direction < 0 ? "end" : "start",
        )
      : null;
    const desiredX = deps.preferredColumnX() ?? deps.caretBox().left;

    let offset = 0;
    if (targetElement && surfaceRef) {
      const layout = measureParagraphLayoutFromRects(
        targetParagraph,
        collectParagraphCharRects(surfaceRef, targetParagraph.id),
      );
      const lines = layout.lines;
      const boundaryLine = direction < 0 ? lines[lines.length - 1] : lines[0];
      offset = boundaryLine?.slots.length
        ? boundaryLine.slots.reduce(
            (best: { left: number; offset: number }, slot: { left: number; offset: number }) =>
              Math.abs(
                desiredX +
                  (surfaceRef?.getBoundingClientRect().left ?? 0) -
                  slot.left,
              ) <
              Math.abs(
                desiredX +
                  (surfaceRef?.getBoundingClientRect().left ?? 0) -
                  best.left,
              )
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

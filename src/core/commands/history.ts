import type {
  EditorBlockNode,
  EditorState,
  EditorTableCellNode,
  EditorTableRowNode, EditorParagraphNode, EditorTextRun } from "@/core/model.js";
import {
  getDocumentSections,
  getParagraphLength,
  getParagraphs,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  buildParagraphFromRuns,
  sliceRuns,
} from "@/core/document/paragraphRuns.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";

export function toggleTrackChanges(state: EditorState): EditorState {
  return {
    ...state,
    trackChangesEnabled: !state.trackChangesEnabled,
  };
}

function transformTableRevisionBlocks(
  blocks: EditorBlockNode[],
  revisionId: string,
  accept: boolean,
): EditorBlockNode[] {
  return blocks.flatMap((block): EditorBlockNode[] => {
    if (block.type === "paragraph") return [block];

    let style = block.style;
    if (style?.revision?.id === revisionId) {
      if (accept) {
        const { revision: _revision, ...current } = style;
        style = current;
      } else {
        style = { ...style.revision.previous };
      }
    }

    let gridCols = block.gridCols;
    let gridRevision = block.gridRevision;
    if (gridRevision?.id === revisionId) {
      gridCols = accept ? gridCols : [...gridRevision.previous];
      gridRevision = undefined;
    }

    const sourceRows = block.rows.map((row) => ({
      ...row,
      cells: [...row.cells],
    }));
    for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex += 1) {
      const row = sourceRows[rowIndex]!;
      for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
        const cell = row.cells[cellIndex]!;
        const mergeState = cell.mergeRevisionState;
        if (!mergeState || mergeState.revisionId !== revisionId) continue;

        if (accept) {
          const { mergeRevisionState: _state, ...acceptedCell } = cell;
          row.cells[cellIndex] = acceptedCell;
          continue;
        }

        if (mergeState.orientation === "horizontal") {
          row.cells.splice(
            cellIndex,
            mergeState.currentCellCount,
            ...mergeState.previousCells,
          );
        } else {
          mergeState.previousCells.forEach((previousCell, offset): void => {
            const targetRow = sourceRows[rowIndex + offset];
            if (targetRow) targetRow.cells[cellIndex] = previousCell;
          });
        }
      }
    }

    const rows = sourceRows.flatMap((row): EditorTableRowNode[] => {
      if (row.style?.revision?.id === revisionId) {
        const remove =
          (accept && row.style.revision.type === "delete") ||
          (!accept && row.style.revision.type === "insert");
        if (remove) return [];
      }

      let rowStyle = row.style;
      if (rowStyle?.propertyRevision?.id === revisionId) {
        if (accept) {
          const { propertyRevision: _revision, ...current } = rowStyle;
          rowStyle = current;
        } else {
          rowStyle = {
            ...rowStyle.propertyRevision.previous,
            revision: rowStyle.revision,
          };
        }
      }
      if (rowStyle?.revision?.id === revisionId) {
        const { revision: _revision, ...current } = rowStyle;
        rowStyle = current;
      }

      const cells = row.cells.flatMap((cell): EditorTableCellNode[] => {
        if (cell.style?.revision?.id === revisionId) {
          const remove =
            (accept && cell.style.revision.type === "delete") ||
            (!accept && cell.style.revision.type === "insert");
          if (remove) return [];
        }

        let cellStyle = cell.style;
        if (cellStyle?.propertyRevision?.id === revisionId) {
          if (accept) {
            const { propertyRevision: _revision, ...current } = cellStyle;
            cellStyle = current;
          } else {
            cellStyle = {
              ...cellStyle.propertyRevision.previous,
              revision: cellStyle.revision,
            };
          }
        }

        let nextCell = {
          ...cell,
          style: cellStyle,
          blocks: transformTableRevisionBlocks(
            cell.blocks,
            revisionId,
            accept,
          ) as typeof cell.blocks,
        };
        if (
          cellStyle?.revision?.id === revisionId &&
          cell.mergeRevisionState?.revisionId !== revisionId
        ) {
          const revision = cellStyle.revision;
          const { revision: _revision, ...current } = cellStyle;
          nextCell = {
            ...nextCell,
            ...(accept || revision.type !== "merge" ? {} : revision.previous),
            style: current,
          };
        }
        return [nextCell];
      });

      return [
        {
          ...row,
          isHeader:
            rowStyle && "isHeader" in rowStyle
              ? rowStyle.isHeader
              : row.isHeader,
          style: rowStyle,
          cells,
        },
      ];
    });

    if (rows.length === 0) return [];
    return [{ ...block, style, gridCols, gridRevision, rows }];
  });
}

function transformTableRevision(
  state: EditorState,
  revisionId: string,
  accept: boolean,
): EditorState {
  const sections = getDocumentSections(state.document).map((section) => ({
    ...section,
    blocks: transformTableRevisionBlocks(section.blocks, revisionId, accept),
    header: section.header
      ? transformTableRevisionBlocks(section.header, revisionId, accept)
      : undefined,
    firstPageHeader: section.firstPageHeader
      ? transformTableRevisionBlocks(
          section.firstPageHeader,
          revisionId,
          accept,
        )
      : undefined,
    evenPageHeader: section.evenPageHeader
      ? transformTableRevisionBlocks(section.evenPageHeader, revisionId, accept)
      : undefined,
    footer: section.footer
      ? transformTableRevisionBlocks(section.footer, revisionId, accept)
      : undefined,
    firstPageFooter: section.firstPageFooter
      ? transformTableRevisionBlocks(
          section.firstPageFooter,
          revisionId,
          accept,
        )
      : undefined,
    evenPageFooter: section.evenPageFooter
      ? transformTableRevisionBlocks(section.evenPageFooter, revisionId, accept)
      : undefined,
  }));
  return { ...state, document: { ...state.document, sections } };
}

export function acceptRevision(
  state: EditorState,
  revisionId: string,
): EditorState {
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph): EditorParagraphNode => {
    const nextRuns = paragraph.runs
      .filter(
        (run): boolean =>
          !(run.revision?.id === revisionId && run.revision.type === "delete"),
      )
      .map((run): EditorTextRun => {
        if (run.revision?.id === revisionId && run.revision.type === "insert") {
          const nextRun = { ...run };
          delete nextRun.revision;
          return nextRun;
        }
        return run;
      });

    if (
      nextRuns.length === paragraph.runs.length &&
      nextRuns.every((run, i): boolean => run === paragraph.runs[i])
    ) {
      return paragraph;
    }

    return buildParagraphFromRuns(paragraph, nextRuns);
  });

  const textState = cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
  return transformTableRevision(textState, revisionId, true);
}

export function rejectRevision(
  state: EditorState,
  revisionId: string,
): EditorState {
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph): EditorParagraphNode => {
    const nextRuns = paragraph.runs
      .filter(
        (run): boolean =>
          !(run.revision?.id === revisionId && run.revision.type === "insert"),
      )
      .map((run): EditorTextRun => {
        if (run.revision?.id === revisionId && run.revision.type === "delete") {
          const nextRun = { ...run };
          delete nextRun.revision;
          return nextRun;
        }
        return run;
      });

    if (
      nextRuns.length === paragraph.runs.length &&
      nextRuns.every((run, i): boolean => run === paragraph.runs[i])
    ) {
      return paragraph;
    }

    return buildParagraphFromRuns(paragraph, nextRuns);
  });

  const textState = cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
  return transformTableRevision(textState, revisionId, false);
}

function collectTableRevisionIds(
  blocks: EditorBlockNode[],
  selectedParagraphIds: Set<string>,
  revisionIds: Set<string>,
): void {
  for (const block of blocks) {
    if (block.type === "paragraph") continue;
    const tableSelected = block.rows.some((row): boolean =>
      row.cells.some((cell): boolean =>
        cell.blocks.some((paragraph): boolean => selectedParagraphIds.has(paragraph.id)),
      ),
    );
    if (tableSelected) {
      if (block.style?.revision) revisionIds.add(block.style.revision.id);
      if (block.gridRevision) revisionIds.add(block.gridRevision.id);
    }
    for (const row of block.rows) {
      const selectedCells = row.cells.filter((cell): boolean =>
        cell.blocks.some((paragraph): boolean => selectedParagraphIds.has(paragraph.id)),
      );
      if (selectedCells.length > 0) {
        if (row.style?.revision) revisionIds.add(row.style.revision.id);
        if (row.style?.propertyRevision) {
          revisionIds.add(row.style.propertyRevision.id);
        }
      }
      for (const cell of selectedCells) {
        if (cell.style?.revision) revisionIds.add(cell.style.revision.id);
        if (cell.style?.propertyRevision) {
          revisionIds.add(cell.style.propertyRevision.id);
        }
        collectTableRevisionIds(cell.blocks, selectedParagraphIds, revisionIds);
      }
    }
  }
}

export function acceptRevisionsInSelection(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const revisionIds = new Set<string>();

  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    const paragraph = paragraphs[i];
    const startOffset =
      i === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      i === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);
    const runs = sliceRuns(paragraph, startOffset, endOffset);
    for (const run of runs) {
      if (run.revision?.id) {
        revisionIds.add(run.revision.id);
      }
    }
  }

  const selectedParagraphIds = new Set(
    paragraphs
      .slice(normalized.startIndex, normalized.endIndex + 1)
      .map((paragraph): string => paragraph.id),
  );
  for (const section of getDocumentSections(state.document)) {
    for (const blocks of [
      section.blocks,
      section.header,
      section.firstPageHeader,
      section.evenPageHeader,
      section.footer,
      section.firstPageFooter,
      section.evenPageFooter,
    ]) {
      if (blocks) {
        collectTableRevisionIds(blocks, selectedParagraphIds, revisionIds);
      }
    }
  }

  let nextState = state;
  for (const revisionId of revisionIds) {
    nextState = acceptRevision(nextState, revisionId);
  }

  return nextState;
}

export function rejectRevisionsInSelection(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const revisionIds = new Set<string>();

  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    const paragraph = paragraphs[i];
    const startOffset =
      i === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      i === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);
    const runs = sliceRuns(paragraph, startOffset, endOffset);
    for (const run of runs) {
      if (run.revision?.id) {
        revisionIds.add(run.revision.id);
      }
    }
  }

  const selectedParagraphIds = new Set(
    paragraphs
      .slice(normalized.startIndex, normalized.endIndex + 1)
      .map((paragraph): string => paragraph.id),
  );
  for (const section of getDocumentSections(state.document)) {
    for (const blocks of [
      section.blocks,
      section.header,
      section.firstPageHeader,
      section.evenPageHeader,
      section.footer,
      section.firstPageFooter,
      section.evenPageFooter,
    ]) {
      if (blocks) {
        collectTableRevisionIds(blocks, selectedParagraphIds, revisionIds);
      }
    }
  }

  let nextState = state;
  for (const revisionId of revisionIds) {
    nextState = rejectRevision(nextState, revisionId);
  }

  return nextState;
}

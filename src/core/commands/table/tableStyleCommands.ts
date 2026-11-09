import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorState,
  EditorTableNode,
  EditorTableStyle,
} from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  patchStyleValue,
  createTableRevisionMetadata,
  updateNestedTablesInBlocks,
  updateStateSections,
  resolveActiveTableLocation,
  getBlocksForZone,
  readInnermostTableAtPath,
} from "./tableCommandUtils.js";

function collectLinearSelectedParagraphIds(state: EditorState): Set<string> {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const selectedParagraphIds = new Set<string>();
  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    selectedParagraphIds.add(paragraphs[i]!.id);
  }
  return selectedParagraphIds;
}

function tableHasDirectSelectedParagraph(
  table: EditorTableNode,
  selectedParagraphIds: ReadonlySet<string>,
): boolean {
  return table.rows.some((row): boolean =>
    row.cells.some((cell): boolean =>
      cell.blocks.some(
        (block): boolean =>
          block.type === "paragraph" && selectedParagraphIds.has(block.id),
      ),
    ),
  );
}

export function setTableStyleValue<K extends keyof EditorTableStyle>(
  state: EditorState,
  key: K,
  value: EditorTableStyle[K] | null,
): EditorState {
  const selectedParagraphIds = collectLinearSelectedParagraphIds(state);

  const updateTable = (table: EditorTableNode): EditorTableNode => {
    let style = table.style;
    if (state.trackChangesEnabled && key !== "revision" && !style?.revision) {
      style = {
        ...(style ?? {}),
        revision: {
          ...createTableRevisionMetadata(),
          type: "property",
          previous: { ...(style ?? {}) },
        },
      };
    }
    return { ...table, style: patchStyleValue(style, key, value) };
  };

  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] =>
    blocks.map((block): EditorParagraphNode | EditorTableNode => {
      if (block.type === "paragraph") return block;

      const updatedRows = block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: updateBlocks(cell.blocks),
        })),
      }));
      const nextTable = { ...block, rows: updatedRows };
      return tableHasDirectSelectedParagraph(block, selectedParagraphIds)
        ? updateTable(nextTable)
        : nextTable;
    });

  return updateStateSections(state, updateBlocks);
}

export function setActiveTableStyleValue<K extends keyof EditorTableStyle>(
  state: EditorState,
  tableId: string,
  key: K,
  value: EditorTableStyle[K] | null,
): EditorState {
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;
    let style = table.style;
    if (state.trackChangesEnabled && key !== "revision" && !style?.revision) {
      style = {
        ...(style ?? {}),
        revision: {
          ...createTableRevisionMetadata(),
          type: "property",
          previous: { ...(style ?? {}) },
        },
      };
    }
    return {
      ...table,
      style: patchStyleValue(style, key, value),
    };
  };

  return updateStateSections(state, (blocks): EditorBlockNode[] =>
    updateNestedTablesInBlocks(blocks, updateTable),
  );
}

/** True when the caret sits in a table whose preferred width can change. */
export function canSetActiveTableWidth(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Word's table preferred width (Table Properties › Preferred width, w:tblW).
 * Resolves the innermost table under the caret and applies the requested
 * width to its style through `setActiveTableStyleValue`. A no-op when the
 * caret is not inside a table; a null payload clears the explicit width.
 */
export function setActiveTableWidth(
  state: EditorState,
  width: number | string | null,
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;
  const { activeSectionIndex, loc } = target;

  const blocks = getBlocksForZone(state.document, activeSectionIndex, loc.zone);
  const table = readInnermostTableAtPath(blocks, loc.tablePath);
  if (!table) return state;

  return setActiveTableStyleValue(state, table.id, "width", width);
}

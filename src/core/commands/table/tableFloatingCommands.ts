import type { EditorState, EditorTableFloatingLayout } from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import {
  setActiveTableStyleValue,
  setTableStyleValue,
} from "./tableStyleCommands.js";

export function setSelectedTableFloatingLayout(
  state: EditorState,
  floating: EditorTableFloatingLayout | null,
): EditorState {
  return setTableStyleValue(state, "floating", floating);
}

export function setActiveTableFloatingLayout(
  state: EditorState,
  tableId: string,
  floating: EditorTableFloatingLayout | null,
): EditorState {
  return setActiveTableStyleValue(state, tableId, "floating", floating);
}

export function moveActiveFloatingTable(
  state: EditorState,
  tableId: string,
  deltaXPoints: number,
  deltaYPoints: number,
): EditorState {
  const sections = getDocumentSections(state.document);
  let current: EditorTableFloatingLayout | undefined;
  const visit = (blocks: (typeof sections)[number]["blocks"]): void => {
    for (const block of blocks) {
      if (block.type !== "table") continue;
      if (block.id === tableId) current = block.style?.floating;
      for (const row of block.rows) {
        for (const cell of row.cells) visit(cell.blocks);
      }
    }
  };
  for (const section of sections) {
    visit(section.blocks);
    if (section.header) visit(section.header);
    if (section.footer) visit(section.footer);
  }
  if (!current) return state;
  return setActiveTableFloatingLayout(state, tableId, {
    ...current,
    x: (current.x ?? 0) + deltaXPoints,
    y: (current.y ?? 0) + deltaYPoints,
    xAlign: undefined,
    yAlign: undefined,
  });
}

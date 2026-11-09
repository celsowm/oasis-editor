/**
 * Table alignment commands.
 *
 * Word's table Alignment (Table › Table Properties › Table tab) is the OOXML
 * `w:tblPr/w:jc` element: left, center or right alignment of the table on the
 * page. This module sets the alignment on the active table (the one the caret
 * sits in).
 *
 * Only the three valid OOXML values are stored; anything else or `null`
 * removes the key (the Word default of left). A no-op returns the same state
 * when nothing can change.
 */
import type {
  EditorBlockNode,
  EditorState,
  EditorTableNode,
} from "@/core/model.js";
import { resolveTablePath } from "@/core/model.js";
import {
  getBlocksForZone,
  resolveActiveTableLocation,
} from "./tableCommandUtils.js";
import { setTableStyleValue } from "./tableStyleCommands.js";

/** The valid `w:jc` table alignment values. */
export type TableAlignment = "left" | "center" | "right";

const VALID_ALIGNMENTS: ReadonlySet<string> = new Set([
  "left",
  "center",
  "right",
]);

/** True when the caret sits inside a table whose alignment can be set. */
export function canSetActiveTableAlignment(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

function resolveActiveTableNode(
  state: EditorState,
  blocks: EditorBlockNode[],
): EditorTableNode | null {
  const target = resolveActiveTableLocation(state);
  if (!target) return null;
  const resolved = resolveTablePath(blocks, target.loc.tablePath);
  const innermost = resolved?.[resolved.length - 1];
  return innermost?.table ?? null;
}

/**
 * Set the active table's alignment (`w:jc`) to `left`, `center` or `right`, or
 * clear it with `null`. Returns the same state when the value is unchanged.
 */
export function setActiveTableAlignment(
  state: EditorState,
  alignment: TableAlignment | null,
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) {
    return state;
  }
  if (alignment !== null && !VALID_ALIGNMENTS.has(alignment)) {
    return state;
  }
  const blocks =
    getBlocksForZone(state.document, target.activeSectionIndex, target.loc
      .zone) ?? [];
  const table = resolveActiveTableNode(state, blocks);
  if (!table) {
    return state;
  }
  const current = table.style?.align;
  const next = alignment === null ? undefined : alignment;
  if (current === next) {
    return state;
  }
  return setTableStyleValue(state, "align", next);
}

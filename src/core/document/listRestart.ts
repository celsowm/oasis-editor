/**
 * Read-only view of restart/continue availability for the current selection.
 *
 * A "restart" is an explicit `startAt` on the selected paragraphs; a
 * "continue" removes it so the paragraph resumes the instance counter. The
 * renderer and the OOXML exporter consume the same `startAt` field.
 */
import type { EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";

export interface ListRestartInfo {
  canRestart: boolean;
  canContinue: boolean;
  currentStartAt?: number;
}

export function getListRestartInfo(state: EditorState): ListRestartInfo {
  const normalized = normalizeSelection(state);
  const selected = getParagraphs(state).slice(
    normalized.startIndex,
    normalized.endIndex + 1,
  );
  const listed = selected.filter((paragraph) => paragraph.list);
  const starts = new Set(
    listed
      .map((paragraph) => paragraph.list?.startAt)
      .filter((value): value is number => typeof value === "number"),
  );
  return {
    canRestart: listed.length > 0,
    canContinue: starts.size > 0,
    ...(starts.size === 1 ? { currentStartAt: [...starts][0] } : {}),
  };
}

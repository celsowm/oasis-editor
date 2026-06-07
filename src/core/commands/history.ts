import type { EditorState } from "../model.js";
import { getParagraphLength, getParagraphs } from "../model.js";
import { normalizeSelection } from "../selection.js";
import {
  buildParagraphFromRuns,
  sliceRuns,
} from "../document/paragraphRuns.js";
import { cloneStateWithParagraphs } from "../document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "../selection/rangeEditing.js";

export function toggleTrackChanges(state: EditorState): EditorState {
  return {
    ...state,
    trackChangesEnabled: !state.trackChangesEnabled,
  };
}

export function acceptRevision(
  state: EditorState,
  revisionId: string,
): EditorState {
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph) => {
    const nextRuns = paragraph.runs
      .filter(
        (run) =>
          !(run.revision?.id === revisionId && run.revision.type === "delete"),
      )
      .map((run) => {
        if (run.revision?.id === revisionId && run.revision.type === "insert") {
          const nextRun = { ...run };
          delete nextRun.revision;
          return nextRun;
        }
        return run;
      });

    if (
      nextRuns.length === paragraph.runs.length &&
      nextRuns.every((run, i) => run === paragraph.runs[i])
    ) {
      return paragraph;
    }

    return buildParagraphFromRuns(paragraph, nextRuns);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
}

export function rejectRevision(
  state: EditorState,
  revisionId: string,
): EditorState {
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph) => {
    const nextRuns = paragraph.runs
      .filter(
        (run) =>
          !(run.revision?.id === revisionId && run.revision.type === "insert"),
      )
      .map((run) => {
        if (run.revision?.id === revisionId && run.revision.type === "delete") {
          const nextRun = { ...run };
          delete nextRun.revision;
          return nextRun;
        }
        return run;
      });

    if (
      nextRuns.length === paragraph.runs.length &&
      nextRuns.every((run, i) => run === paragraph.runs[i])
    ) {
      return paragraph;
    }

    return buildParagraphFromRuns(paragraph, nextRuns);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
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

  let nextState = state;
  for (const revisionId of revisionIds) {
    nextState = rejectRevision(nextState, revisionId);
  }

  return nextState;
}

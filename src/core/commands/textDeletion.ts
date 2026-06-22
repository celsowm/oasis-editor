import type { EditorState, EditorTextRun } from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import {
  getStyleAtOffset,
  sliceRuns,
  buildParagraphFromRuns,
} from "@/core/document/paragraphRuns.js";
import { cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";

export function deleteBackward(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);

  if (offset > 0) {
    if (state.trackChangesEnabled) {
      const runs = paragraph.runs;
      let consumed = 0;
      let targetRunIndex = -1;
      let runOffset = -1;
      for (let i = 0; i < runs.length; i += 1) {
        const nextConsumed = consumed + runs[i].text.length;
        if (offset <= nextConsumed) {
          targetRunIndex = i;
          runOffset = offset - consumed;
          break;
        }
        consumed = nextConsumed;
      }

      if (targetRunIndex !== -1) {
        const targetRun = runs[targetRunIndex];
        // If we are deleting an "insert" revision, just remove the character
        if (targetRun.revision?.type === "insert") {
          const nextRuns = [
            ...sliceRuns(paragraph, 0, offset - 1),
            ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
          ];
          const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
          const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
            candidateIndex === index ? nextParagraph : candidate,
          );
          return cloneStateWithParagraphs(
            state,
            nextParagraphs,
            withSelection(paragraphOffsetToPosition(nextParagraph, offset - 1)),
          );
        }

        // Otherwise, split and mark as "delete"
        const charToDelete = targetRun.text[runOffset - 1];
        const deletionRun: EditorTextRun = {
          id: `run:${Math.random().toString(36).slice(2, 9)}`,
          text: charToDelete,
          kind: "text",
          styles: { ...targetRun.styles },
          revision: {
            id: `rev:${Math.random().toString(36).slice(2, 9)}`,
            type: "delete",
            author: "User",
            date: Date.now(),
          },
        };

        const nextRuns = [
          ...sliceRuns(paragraph, 0, offset - 1),
          deletionRun,
          ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
        ];
        const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
        const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
          candidateIndex === index ? nextParagraph : candidate,
        );
        return cloneStateWithParagraphs(
          state,
          nextParagraphs,
          withSelection(paragraphOffsetToPosition(nextParagraph, offset - 1)),
        );
      }
    }

    const nextParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...sliceRuns(paragraph, 0, offset - 1),
        ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
      ],
      getStyleAtOffset(paragraph, offset - 1),
    );
    const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
      candidateIndex === index ? nextParagraph : candidate,
    );

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(paragraphOffsetToPosition(nextParagraph, offset - 1)),
    );
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  const mergedParagraph = buildParagraphFromRuns(previousParagraph, [
    ...previousParagraph.runs.map(cloneRun),
    ...paragraph.runs.map(cloneRun),
  ]);
  const nextParagraphs = [
    ...paragraphs.slice(0, index - 1),
    mergedParagraph,
    ...paragraphs.slice(index + 1),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(
      paragraphOffsetToPosition(
        mergedParagraph,
        getParagraphLength(previousParagraph),
      ),
    ),
  );
}

export function deleteForward(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);

  if (offset < getParagraphLength(paragraph)) {
    if (state.trackChangesEnabled) {
      const runs = paragraph.runs;
      let consumed = 0;
      let targetRunIndex = -1;
      let runOffset = -1;
      for (let i = 0; i < runs.length; i += 1) {
        const nextConsumed = consumed + runs[i].text.length;
        if (offset < nextConsumed) {
          targetRunIndex = i;
          runOffset = offset - consumed;
          break;
        }
        consumed = nextConsumed;
      }

      if (targetRunIndex !== -1) {
        const targetRun = runs[targetRunIndex];
        // If we are deleting an "insert" revision, just remove the character
        if (targetRun.revision?.type === "insert") {
          const nextRuns = [
            ...sliceRuns(paragraph, 0, offset),
            ...sliceRuns(paragraph, offset + 1, getParagraphLength(paragraph)),
          ];
          const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
          const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
            candidateIndex === index ? nextParagraph : candidate,
          );
          return cloneStateWithParagraphs(
            state,
            nextParagraphs,
            withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
          );
        }

        // Otherwise, split and mark as "delete"
        const charToDelete = targetRun.text[runOffset];
        const deletionRun: EditorTextRun = {
          id: `run:${Math.random().toString(36).slice(2, 9)}`,
          text: charToDelete,
          kind: "text",
          styles: { ...targetRun.styles },
          revision: {
            id: `rev:${Math.random().toString(36).slice(2, 9)}`,
            type: "delete",
            author: "User",
            date: Date.now(),
          },
        };

        const nextRuns = [
          ...sliceRuns(paragraph, 0, offset),
          deletionRun,
          ...sliceRuns(paragraph, offset + 1, getParagraphLength(paragraph)),
        ];
        const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
        const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
          candidateIndex === index ? nextParagraph : candidate,
        );
        return cloneStateWithParagraphs(
          state,
          nextParagraphs,
          withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
        );
      }
    }

    const nextParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...sliceRuns(paragraph, 0, offset),
        ...sliceRuns(paragraph, offset + 1, getParagraphLength(paragraph)),
      ],
      getStyleAtOffset(paragraph, offset),
    );
    const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
      candidateIndex === index ? nextParagraph : candidate,
    );

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
    );
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  const mergedParagraph = buildParagraphFromRuns(paragraph, [
    ...paragraph.runs.map(cloneRun),
    ...nextParagraph.runs.map(cloneRun),
  ]);
  const nextParagraphs = [
    ...paragraphs.slice(0, index),
    mergedParagraph,
    ...paragraphs.slice(index + 2),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, offset)),
  );
}

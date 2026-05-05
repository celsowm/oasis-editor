import type { EditorState, EditorTextRun, EditorTextStyle } from "../model.js";
import { getParagraphLength, getParagraphs, paragraphOffsetToPosition } from "../model.js";
import { createEditorStyledRun } from "../editorState.js";
import { isSelectionCollapsed, normalizeSelection } from "../selection.js";
import { deleteSelectionRange, getFocusParagraph, getStyleAtOffset, insertRunsAtOffset, cloneParagraph, cloneStateWithParagraphs, withSelection, sliceRuns, buildParagraphFromRuns, createParagraphFromRuns, cloneParagraphs, cloneRun, ToggleableTextStyleKey, mapRunsInRange, setBooleanStyle, preserveSelectionByParagraphOffsets, ValueTextStyleKey, setValueStyle } from "./utils.js";

export function insertTextAtSelection(
  state: EditorState,
  text: string,
  styleOverride?: EditorTextStyle,
): EditorState {
  if (text.length === 0) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const styles = styleOverride ? { ...styleOverride } : getStyleAtOffset(paragraph, offset);
  
  const insertedRun: EditorTextRun = {
    id: `run:${Math.random().toString(36).slice(2, 9)}`,
    text,
    styles,
  };

  if (collapsedState.trackChangesEnabled) {
    insertedRun.revision = {
      id: `rev:${Math.random().toString(36).slice(2, 9)}`,
      type: "insert",
      author: "User", // TODO: Get from context
      date: Date.now(),
    };
  }

  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
    candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + text.length)),
  );
}

export function insertPlainTextAtSelection(
  state: EditorState,
  text: string,
  styleOverride?: EditorTextStyle,
): EditorState {
  if (text.length === 0) {
    return state;
  }

  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalizedText.includes("\n")) {
    return insertTextAtSelection(state, normalizedText, styleOverride);
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const lines = normalizedText.split("\n");
  const insertionStyles = styleOverride ? { ...styleOverride } : getStyleAtOffset(paragraph, offset);
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const firstParagraph = buildParagraphFromRuns(paragraph, [
    ...beforeRuns,
    createEditorStyledRun(lines[0], insertionStyles),
  ], insertionStyles);
  const tailRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const middleParagraphs = lines
    .slice(1, -1)
    .map((line) => createParagraphFromRuns([{ text: line, styles: insertionStyles }]));
  const lastParagraph = createParagraphFromRuns([
    { text: lines[lines.length - 1], styles: insertionStyles },
    ...tailRuns.map((run) => ({ text: run.text, styles: run.styles })),
  ]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    ...middleParagraphs,
    lastParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(lastParagraph, lines[lines.length - 1].length)),
  );
}

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
            candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
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
          candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
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
      candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
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
    ...cloneParagraphs(paragraphs.slice(0, index - 1)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, getParagraphLength(previousParagraph))),
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
            candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
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
          candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
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
      candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
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
    ...cloneParagraphs(paragraphs.slice(0, index)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 2)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, offset)),
  );
}

export function toggleTextStyle(
  state: EditorState,
  key: ToggleableTextStyleKey,
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const touchedParagraphs = paragraphs
    .slice(normalized.startIndex, normalized.endIndex + 1);
    const touchedParagraphIds = touchedParagraphs.map(p => p.id).join(",");
  // eslint-disable-next-line no-console
  console.log(`[toggleTextStyle:${key}] paragraphs[${normalized.startIndex}..${normalized.endIndex}]: ${touchedParagraphIds}`);

  const touchedRuns = touchedParagraphs
    .flatMap((paragraph, relativeIndex) => {
      const paragraphIndex = normalized.startIndex + relativeIndex;
      const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);
      return sliceRuns(paragraph, startOffset, endOffset);
    })
    .filter((run) => run.text.length > 0);

  if (touchedRuns.length === 0) {
    return state;
  }

  const shouldEnable = !touchedRuns.every((run) => Boolean(run.styles?.[key]));
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      paragraphIndex === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);

    return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
      ...run,
      styles: setBooleanStyle(run.styles, key, shouldEnable),
    }));
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setTextStyleValue<K extends ValueTextStyleKey>(
  state: EditorState,
  key: K,
  value: EditorTextStyle[K] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      paragraphIndex === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);

    return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
      ...run,
      styles: setValueStyle(run.styles, key, value),
    }));
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

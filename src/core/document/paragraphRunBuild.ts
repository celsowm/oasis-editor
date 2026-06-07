import type {
  EditorParagraphNode,
  EditorTextRun,
  EditorTextStyle,
} from "../model.js";
import {
  createEditorParagraphFromRuns,
  createEditorStyledRun,
} from "../editorState.js";
import {
  cloneParagraph,
  cloneParagraphList,
} from "./clone.js";
import {
  cloneStyle,
  stylesEqual,
} from "../textStyle/textStyleMutations.js";

export function normalizeRuns(
  runs: EditorTextRun[],
  fallbackStyles?: EditorTextStyle,
): EditorTextRun[] {
  const merged: EditorTextRun[] = [];

  for (const run of runs) {
    if (run.text.length === 0) {
      continue;
    }

    const previous = merged[merged.length - 1];
    if (
      previous &&
      !run.image &&
      !previous.image &&
      stylesEqual(previous.styles, run.styles)
    ) {
      previous.text += run.text;
      continue;
    }

    merged.push({
      ...run,
      styles: cloneStyle(run.styles),
    });
  }

  if (merged.length > 0) {
    return merged;
  }

  return [createEditorStyledRun("", fallbackStyles)];
}

export function buildParagraphFromRuns(
  paragraph: EditorParagraphNode,
  runs: EditorTextRun[],
  fallbackStyles?: EditorTextStyle,
): EditorParagraphNode {
  return {
    ...paragraph,
    runs: normalizeRuns(runs, fallbackStyles),
    style: paragraph.style ? { ...paragraph.style } : undefined,
  };
}

export function createParagraphFromRuns(
  textRuns: Array<{ text: string; styles?: EditorTextStyle }>,
): EditorParagraphNode {
  return createEditorParagraphFromRuns(textRuns);
}

export function createParagraphFromRunsLike(
  paragraph: EditorParagraphNode,
  textRuns: Array<{ text: string; styles?: EditorTextStyle }>,
): EditorParagraphNode {
  const nextParagraph = createParagraphFromRuns(textRuns);
  nextParagraph.style = paragraph.style ? { ...paragraph.style } : undefined;
  nextParagraph.list = cloneParagraphList(paragraph.list);
  return nextParagraph;
}

export function cloneParagraphWithListLevel(
  paragraph: EditorParagraphNode,
  level: number,
): EditorParagraphNode {
  const nextParagraph = cloneParagraph(paragraph);
  if (!nextParagraph.list) {
    return nextParagraph;
  }

  nextParagraph.list = {
    ...nextParagraph.list,
    level: Math.max(0, level),
  };
  return nextParagraph;
}

export function clearParagraphList(
  paragraph: EditorParagraphNode,
): EditorParagraphNode {
  const nextParagraph = cloneParagraph(paragraph);
  delete nextParagraph.list;
  return nextParagraph;
}

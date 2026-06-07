import type {
  EditorParagraphNode,
  EditorTextRun,
} from "../model.js";
import { getParagraphLength } from "../model.js";
import { cloneStyle } from "../textStyle/textStyleMutations.js";
import { buildParagraphFromRuns } from "./paragraphRunBuild.js";
import {
  getStyleAtOffset,
  sliceRuns,
} from "./paragraphRunQuery.js";

export function insertRunsAtOffset(
  paragraph: EditorParagraphNode,
  offset: number,
  textRuns: EditorTextRun[],
): EditorParagraphNode {
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const fallbackStyles = getStyleAtOffset(paragraph, offset);

  return buildParagraphFromRuns(
    paragraph,
    [
      ...beforeRuns,
      ...textRuns.map((run) => ({
        ...run,
        styles: cloneStyle(run.styles ?? fallbackStyles),
      })),
      ...afterRuns,
    ],
    fallbackStyles,
  );
}

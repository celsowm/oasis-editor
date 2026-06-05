import type {
  EditorParagraphListStyle,
  EditorParagraphStyle,
  EditorParagraphNode,
  EditorState,
  EditorTextStyle,
  EditorImageRunData,
} from "../model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "../model.js";
import { createEditorParagraphFromRuns } from "../editorState.js";
import { isSelectionCollapsed, normalizeSelection } from "../selection.js";
import {
  sliceRuns,
  paragraphStyleToCssText,
  serializeParagraphRunsToHtml,
  cloneStyle,
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
  buildParagraphFromRuns,
  cloneRun,
  getStyleAtOffset,
  cloneParagraphs,
  cloneParagraph,
  cloneStateWithParagraphs,
} from "./utils.js";

export interface EditorClipboardParagraphSpec {
  runs: Array<{
    text: string;
    styles?: EditorTextStyle;
    image?: EditorImageRunData;
  }>;
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
}

export function serializeEditorSelectionToHtml(state: EditorState): string {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return "";
  }

  const paragraphs = getParagraphs(state);
  const htmlParts: string[] = [];
  let activeListKind: EditorParagraphListStyle["kind"] | null = null;

  const closeList = () => {
    if (activeListKind) {
      htmlParts.push(activeListKind === "bullet" ? "</ul>" : "</ol>");
      activeListKind = null;
    }
  };

  for (
    let index = normalized.startIndex;
    index <= normalized.endIndex;
    index += 1
  ) {
    const paragraph = paragraphs[index];
    if (!paragraph) {
      continue;
    }

    const startOffset =
      index === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      index === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);
    const runs = sliceRuns(paragraph, startOffset, endOffset);
    const css = paragraphStyleToCssText(paragraph.style);
    const attrs = css.length > 0 ? ` style="${css}"` : "";
    const paragraphHtml = serializeParagraphRunsToHtml(runs, state.document);

    if (paragraph.list?.kind) {
      const wrapperTag = paragraph.list.kind === "bullet" ? "ul" : "ol";
      if (activeListKind !== paragraph.list.kind) {
        closeList();
        htmlParts.push(`<${wrapperTag}>`);
        activeListKind = paragraph.list.kind;
      }
      htmlParts.push(`<li${attrs}>${paragraphHtml}</li>`);
      continue;
    }

    closeList();
    htmlParts.push(`<p${attrs}>${paragraphHtml}</p>`);
  }

  closeList();
  return htmlParts.join("");
}

export function insertClipboardParagraphsAtSelection(
  state: EditorState,
  paragraphsSpec: EditorClipboardParagraphSpec[],
): EditorState {
  if (paragraphsSpec.length === 0) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const paragraphs = getParagraphs(collapsedState);
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const pastedParagraphs = paragraphsSpec.map((spec) => {
    const nextParagraph = createEditorParagraphFromRuns(
      spec.runs.map((run) => ({
        text: run.text,
        styles: cloneStyle(run.styles),
        image: run.image ? { ...run.image } : undefined,
      })),
    );
    nextParagraph.style = spec.style ? { ...spec.style } : undefined;
    nextParagraph.list = spec.list ? { ...spec.list } : undefined;
    return nextParagraph;
  });

  let nextParagraphs: EditorParagraphNode[];
  let nextSelection = withSelection(
    paragraphOffsetToPosition(paragraph, offset),
  );

  if (pastedParagraphs.length === 1) {
    const source = pastedParagraphs[0]!;
    const sourceLength = source.runs.reduce(
      (total, run) => total + run.text.length,
      0,
    );
    const mergedParagraph = buildParagraphFromRuns(
      paragraph,
      [...beforeRuns, ...source.runs.map(cloneRun), ...afterRuns],
      getStyleAtOffset(paragraph, offset),
    );
    mergedParagraph.style = paragraph.style
      ? { ...paragraph.style }
      : source.style
        ? { ...source.style }
        : undefined;
    mergedParagraph.list = paragraph.list
      ? { ...paragraph.list }
      : source.list
        ? { ...source.list }
        : undefined;
    nextParagraphs = [
      ...cloneParagraphs(paragraphs.slice(0, index)),
      mergedParagraph,
      ...cloneParagraphs(paragraphs.slice(index + 1)),
    ];
    nextSelection = withSelection(
      paragraphOffsetToPosition(
        mergedParagraph,
        beforeRuns.reduce((total, run) => total + run.text.length, 0) +
          sourceLength,
      ),
    );
  } else {
    const firstSource = pastedParagraphs[0]!;
    const lastSource = pastedParagraphs[pastedParagraphs.length - 1]!;
    const lastSourceLength = lastSource.runs.reduce(
      (total, run) => total + run.text.length,
      0,
    );
    const firstParagraph = buildParagraphFromRuns(
      paragraph,
      [...beforeRuns, ...firstSource.runs.map(cloneRun)],
      getStyleAtOffset(paragraph, offset),
    );
    firstParagraph.style = paragraph.style
      ? { ...paragraph.style }
      : firstSource.style
        ? { ...firstSource.style }
        : undefined;
    firstParagraph.list = paragraph.list
      ? { ...paragraph.list }
      : firstSource.list
        ? { ...firstSource.list }
        : undefined;

    const middleParagraphs = pastedParagraphs.slice(1, -1).map(cloneParagraph);

    const lastParagraph = buildParagraphFromRuns(
      lastSource,
      [...lastSource.runs.map(cloneRun), ...afterRuns],
      undefined,
    );
    lastParagraph.list = lastSource.list ? { ...lastSource.list } : undefined;

    nextParagraphs = [
      ...cloneParagraphs(paragraphs.slice(0, index)),
      firstParagraph,
      ...middleParagraphs,
      lastParagraph,
      ...cloneParagraphs(paragraphs.slice(index + 1)),
    ];
    nextSelection = withSelection(
      paragraphOffsetToPosition(lastParagraph, lastSourceLength),
    );
  }

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    nextSelection,
  );
}

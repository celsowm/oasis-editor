import { fieldSelectionProtected } from "@/core/document/fieldMutation.js";
import { splitForFieldAdjacentInsertion } from "@/core/document/paragraphRunEdit.js";
import type {
  EditorParagraphListStyle,
  EditorParagraphStyle,
  EditorParagraphNode,
  EditorState,
  EditorTextStyle,
  EditorImageRunData,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { createEditorParagraphFromRuns } from "@/core/editorState.js";
import { isSelectionCollapsed, normalizeSelection } from "@/core/selection.js";
import { paragraphHtmlAttributes } from "@/core/html/htmlTabStops.js";
import { serializeParagraphRunsToHtml } from "@/core/html/htmlTextSerializer.js";
import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";
import {
  sliceRuns,
  buildParagraphFromRuns,
  getStyleAtOffset,
} from "@/core/document/paragraphRuns.js";
import {
  cloneRun,
  cloneParagraphs,
  cloneParagraph,
} from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";

export interface EditorClipboardParagraphSpec {
  runs: Array<{
    text: string;
    styles?: EditorTextStyle;
    image?: EditorImageRunData;
  }>;
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
}

/** A plain-text/HTML clipboard cannot represent source-owned OPC objects.
 * Refuse the entire selection, including mixed text/object ranges, rather
 * than copying a replacement character and subsequently deleting real data. */
export function selectionContainsOpaqueObject(state: EditorState): boolean {
  const paragraphs=getParagraphs(state);
  const selection=normalizeSelection(state,paragraphs);
  if(selection.isCollapsed)return false;
  for(let index=selection.startIndex;index<=selection.endIndex;index++){
    const p=paragraphs[index];
    if(!p)continue;
    const start=index===selection.startIndex?selection.startParagraphOffset:0;
    const end=index===selection.endIndex?selection.endParagraphOffset:getParagraphLength(p);
    let offset=0;
    for(const run of p.runs){
      const next=offset+run.text.length;
      if(run.kind==="opaque"&&offset<end&&next>start)return true;
      offset=next;
    }
  }
  return false;
}

export function serializeEditorSelectionToHtml(state: EditorState): string {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return "";
  }

  const paragraphs = getParagraphs(state);
  const htmlParts: string[] = [];
  let activeListKind: EditorParagraphListStyle["kind"] | null = null;

  const closeList = (): void => {
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
    const attrs = paragraphHtmlAttributes(paragraph, state.document, runs.map(run => run.text).join(""));
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
  if (paragraphsSpec.length === 0 || fieldSelectionProtected(state)) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const paragraphs = getParagraphs(collapsedState);
  const emptyDestination = getParagraphLength(paragraph) === 0;
  if(fieldSelectionProtected(collapsedState))return state;
  const {beforeRuns,afterRuns}=splitForFieldAdjacentInsertion(paragraph,offset);
  const pastedParagraphs = paragraphsSpec.map((spec): EditorParagraphNode => {
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
      (total, run): number => total + run.text.length,
      0,
    );
    const mergedParagraph = buildParagraphFromRuns(
      paragraph,
      [...beforeRuns, ...source.runs.map(cloneRun), ...afterRuns],
      getStyleAtOffset(paragraph, offset),
    );
    mergedParagraph.style = emptyDestination && source.style?.tabs !== undefined
      ? { ...paragraph.style, tabs: source.style.tabs }
      : paragraph.style ? { ...paragraph.style } : source.style ? { ...source.style } : undefined;
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
        beforeRuns.reduce((total, run): number => total + run.text.length, 0) +
          sourceLength,
      ),
    );
  } else {
    const firstSource = pastedParagraphs[0]!;
    const lastSource = pastedParagraphs[pastedParagraphs.length - 1]!;
    const lastSourceLength = lastSource.runs.reduce(
      (total, run): number => total + run.text.length,
      0,
    );
    const firstParagraph = buildParagraphFromRuns(
      paragraph,
      [...beforeRuns, ...firstSource.runs.map(cloneRun)],
      getStyleAtOffset(paragraph, offset),
    );
    firstParagraph.style = emptyDestination && firstSource.style?.tabs !== undefined
      ? { ...paragraph.style, tabs: firstSource.style.tabs }
      : paragraph.style ? { ...paragraph.style } : firstSource.style ? { ...firstSource.style } : undefined;
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

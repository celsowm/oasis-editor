import type {
  EditorBlockNode,
  EditorParagraphStyle,
  EditorPosition,
  EditorState,
  EditorSection,
  EditorTabStop, EditorParagraphNode, EditorTextStyle } from "@/core/model.js";
import {
  getBlockParagraphs,
  getDocumentSections,
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
  getActiveSectionIndex,
  getActiveZone,
} from "@/core/model.js";
import { createEditorParagraph } from "@/core/editorState.js";
import { isSelectionCollapsed, normalizeSelection } from "@/core/selection.js";
import type { ValueParagraphStyleKey } from "@/core/textStyle/textStyleKeys.js";
import { setParagraphStyleValue } from "@/core/textStyle/textStyleMutations.js";
import {
  buildParagraphFromRuns,
  sliceRuns,
  getStyleAtOffset,
  createParagraphFromRunsLike,
} from "@/core/document/paragraphRuns.js";
import {
  cloneParagraphs,
  cloneBlocks,
  cloneParagraph,
} from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  preserveSelectionByParagraphOffsets,
  withSelection,
} from "@/core/selection/rangeEditing.js";

export function moveBlockToPosition(
  state: EditorState,
  blockId: string,
  targetPosition: EditorPosition,
): EditorState {
  // 1. Find and remove the block from its current location
  let movedBlock: EditorBlockNode | undefined;

  const removeFromBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    const idx = blocks.findIndex((b): boolean => b.id === blockId);
    if (idx >= 0) {
      movedBlock = blocks[idx];
      return [...blocks.slice(0, idx), ...blocks.slice(idx + 1)];
    }
    return blocks;
  };

  const removeFromSections = (sections: EditorSection[]): EditorSection[] => {
    return sections.map((s) => ({
      ...s,
      blocks: removeFromBlocks(s.blocks),
      header: s.header ? removeFromBlocks(s.header) : undefined,
      footer: s.footer ? removeFromBlocks(s.footer) : undefined,
    }));
  };

  const nextDocument = { ...state.document };
  if (nextDocument.sections && nextDocument.sections.length > 0) {
    nextDocument.sections = removeFromSections(nextDocument.sections);
  }

  if (!movedBlock) {
    return state;
  }

  // 2. Identify the target block and zone
  const targetId = targetPosition.paragraphId;

  // Check if target is inside the moved block itself
  if (movedBlock.type === "table") {
    const internalParagraphs = getBlockParagraphs(movedBlock);
    if (internalParagraphs.some((p): boolean => p.id === targetId)) {
      return state;
    }
  }

  const insertIntoBlocks = (
    blocks: EditorBlockNode[],
  ): { nextBlocks: EditorBlockNode[]; found: boolean } => {
    const idx = blocks.findIndex((b): boolean => {
      if (b.id === targetId) return true;
      if (b.type === "table") {
        return getBlockParagraphs(b).some((p): boolean => p.id === targetId);
      }
      return false;
    });

    if (idx < 0) return { nextBlocks: blocks, found: false };

    // Insert BEFORE the block containing the target paragraph
    const nextBlocks = [
      ...blocks.slice(0, idx),
      movedBlock!,
      ...blocks.slice(idx),
    ];
    return { nextBlocks, found: true };
  };

  const activeIdx = getActiveSectionIndex(state);
  const zone = getActiveZone(state);
  const activeSection = nextDocument.sections?.[activeIdx];
  const section = { ...activeSection! };
  let found = false;

  if (zone === "header") {
    const res = insertIntoBlocks(section.header ?? []);
    section.header = res.nextBlocks;
    found = res.found;
  } else if (zone === "footer") {
    const res = insertIntoBlocks(section.footer ?? []);
    section.footer = res.nextBlocks;
    found = res.found;
  } else {
    const res = insertIntoBlocks(section.blocks);
    section.blocks = res.nextBlocks;
    found = res.found;
  }

  if (!found) {
    section.blocks = [...section.blocks, movedBlock];
  }

  nextDocument.sections = [...(nextDocument.sections ?? [])];
  nextDocument.sections[activeIdx] = section;

  return {
    ...state,
    document: nextDocument,
  };
}

export function splitBlockAtSelection(state: EditorState): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    sliceRuns(paragraph, 0, offset),
    getStyleAtOffset(paragraph, offset),
  );
  const secondRuns = sliceRuns(
    paragraph,
    offset,
    getParagraphLength(paragraph),
  );
  const nextParagraph =
    secondRuns.length > 0
      ? createParagraphFromRunsLike(
          paragraph,
          secondRuns.map((run): { text: string; styles: EditorTextStyle | undefined; } => ({ text: run.text, styles: run.styles })),
        )
      : ((): EditorParagraphNode => {
          const emptyParagraph = createEditorParagraph("");
          emptyParagraph.style = paragraph.style
            ? { ...paragraph.style }
            : undefined;
          emptyParagraph.list = paragraph.list
            ? { ...paragraph.list }
            : undefined;
          return emptyParagraph;
        })();
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  );
}

export function insertPageBreakAtSelection(state: EditorState): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    sliceRuns(paragraph, 0, offset),
    getStyleAtOffset(paragraph, offset),
  );
  const secondRuns = sliceRuns(
    paragraph,
    offset,
    getParagraphLength(paragraph),
  );
  const nextParagraph =
    secondRuns.length > 0
      ? createParagraphFromRunsLike(
          paragraph,
          secondRuns.map((run): { text: string; styles: EditorTextStyle | undefined; } => ({ text: run.text, styles: run.styles })),
        )
      : ((): EditorParagraphNode => {
          const emptyParagraph = createEditorParagraph("");
          emptyParagraph.style = paragraph.style
            ? { ...paragraph.style }
            : undefined;
          emptyParagraph.list = paragraph.list
            ? { ...paragraph.list }
            : undefined;
          return emptyParagraph;
        })();

  nextParagraph.style = {
    ...(paragraph.style ?? {}),
    pageBreakBefore: true,
  };

  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  );
}

export function insertSectionBreakAtSelection(
  state: EditorState,
  breakType: "nextPage" | "continuous",
): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, offset } = getFocusParagraph(collapsedState);
  const sections = getDocumentSections(collapsedState.document);
  const activeSectionIndex = getActiveSectionIndex(collapsedState);
  const zone = getActiveZone(collapsedState);

  if (zone !== "main") {
    return state;
  }

  const section = sections[activeSectionIndex];
  if (!section) {
    return state;
  }

  // Split the current section blocks at the current paragraph
  const blockIndex = section.blocks.findIndex((block): boolean => {
    if (block.type === "paragraph") {
      return block.id === paragraph.id;
    }
    return false; // For now, we only support splitting at paragraph level
  });

  if (blockIndex === -1) {
    return state;
  }

  const beforeBlocks = section.blocks.slice(0, blockIndex);
  const afterBlocks = section.blocks.slice(blockIndex + 1);

  // Split the paragraph itself
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    sliceRuns(paragraph, 0, offset),
    getStyleAtOffset(paragraph, offset),
  );
  const secondRuns = sliceRuns(
    paragraph,
    offset,
    getParagraphLength(paragraph),
  );
  const secondParagraph =
    secondRuns.length > 0
      ? createParagraphFromRunsLike(
          paragraph,
          secondRuns.map((run): { text: string; styles: EditorTextStyle | undefined; } => ({ text: run.text, styles: run.styles })),
        )
      : ((): EditorParagraphNode => {
          const emptyParagraph = createEditorParagraph("");
          emptyParagraph.style = paragraph.style
            ? { ...paragraph.style }
            : undefined;
          emptyParagraph.list = paragraph.list
            ? { ...paragraph.list }
            : undefined;
          return emptyParagraph;
        })();

  const newSectionId = `section:${Math.random().toString(36).slice(2, 9)}`;
  const newSection: EditorSection = {
    id: newSectionId,
    blocks: [secondParagraph, ...afterBlocks],
    pageSettings: { ...section.pageSettings },
    header: section.header ? cloneBlocks(section.header) : undefined,
    footer: section.footer ? cloneBlocks(section.footer) : undefined,
    breakType: breakType,
  };

  const updatedSection: EditorSection = {
    ...section,
    blocks: [...beforeBlocks, firstParagraph],
  };

  const nextSections = [
    ...sections.slice(0, activeSectionIndex),
    updatedSection,
    newSection,
    ...sections.slice(activeSectionIndex + 1),
  ];

  return {
    ...collapsedState,
    document: {
      ...collapsedState.document,
      sections: nextSections,
    },
    activeSectionIndex: activeSectionIndex + 1,
    selection: withSelection(paragraphOffsetToPosition(secondParagraph, 0)),
  };
}

export function updateSectionSettings(
  state: EditorState,
  sectionIndex: number,
  settings: Partial<EditorSection>,
): EditorState {
  const sections = getDocumentSections(state.document);
  if (sectionIndex < 0 || sectionIndex >= sections.length) {
    return state;
  }

  const nextSections = [...sections];
  nextSections[sectionIndex] = {
    ...nextSections[sectionIndex],
    ...settings,
    pageSettings: {
      ...nextSections[sectionIndex].pageSettings,
      ...(settings.pageSettings ?? {}),
      margins: {
        ...nextSections[sectionIndex].pageSettings.margins,
        ...(settings.pageSettings?.margins ?? {}),
      },
    },
  };

  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function setParagraphNamedStyle(
  state: EditorState,
  styleId: string | null,
): EditorState {
  return setParagraphStyle(state, "styleId", styleId);
}

export function setParagraphStyle<K extends ValueParagraphStyleKey>(
  state: EditorState,
  key: K,
  value: EditorParagraphStyle[K] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const startIndex = normalized.startIndex;
  const endIndex = normalized.endIndex;

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex): EditorParagraphNode => {
    if (paragraphIndex < startIndex || paragraphIndex > endIndex) {
      return cloneParagraph(paragraph);
    }

    return {
      ...cloneParagraph(paragraph),
      style: setParagraphStyleValue(paragraph.style, key, value),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setParagraphTabStops(
  state: EditorState,
  tabs: EditorTabStop[] | null,
): EditorState {
  return setParagraphStyle(state, "tabs", tabs);
}

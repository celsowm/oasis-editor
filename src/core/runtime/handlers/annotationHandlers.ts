import { EditorState } from "../EditorState.js";
import { findBlockById } from "../../document/BlockUtils.js";
import { isTextBlock, TextRun } from "../../document/BlockTypes.js";
import { updateDocumentSections } from "../../document/DocumentMutationUtils.js";
import { registerHandler } from "../OperationHandlers.js";
import { OperationType } from "../../operations/OperationTypes.js";
import { createTextRun, createEquation, createParagraph } from "../../document/DocumentFactory.js";
import { genId } from "../../utils/IdGenerator.js";

function handleInsertField(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { field, newRunId } = op.payload;

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    for (const run of block.children) {
      if (run.id !== inlineId) {
        nextChildren.push(run);
        continue;
      }
      const beforeText = run.text.substring(0, offset);
      const afterText = run.text.substring(offset);

      if (beforeText) {
        nextChildren.push({ ...run, text: beforeText });
      }
      nextChildren.push(
        createTextRun(
          field.type === "page" ? "1" : field.type,
          { ...run.marks },
          undefined,
          field,
        ),
      );
      if (afterText) {
        nextChildren.push({ ...run, text: afterText });
      }
    }
    return { ...block, children: nextChildren };
  });

  return {
    ...nextState,
    selection: {
      anchor: { ...selection.anchor, offset: offset + 1 },
      focus: { ...selection.focus, offset: offset + 1 },
    },
    pendingMarks: undefined,
  };
}

function handleInsertEquation(state: EditorState, op: any): EditorState {
  const { selection, document } = state;
  const { latex, display, newBlockId } = op.payload;
  const equation = createEquation(latex, display);
  if (newBlockId) equation.id = newBlockId;

  let insertSectionIdx = 0;
  let insertBlockIdx = -1;
  if (selection) {
    for (let sIdx = 0; sIdx < document.sections.length; sIdx++) {
      const idx = document.sections[sIdx].children.findIndex(
        (b) => b.id === selection.anchor.blockId,
      );
      if (idx !== -1) {
        insertSectionIdx = sIdx;
        insertBlockIdx = idx;
        break;
      }
    }
  }

  const nextSections = document.sections.map((section, sIdx) => {
    if (sIdx !== insertSectionIdx) return section;
    const children = [...section.children];
    children.splice(insertBlockIdx + 1, 0, equation);
    return { ...section, children };
  });

  return {
    ...state,
    document: {
      ...document,
      revision: document.revision + 1,
      sections: nextSections,
    },
    selection: null,
    selectedImageId: null,
  };
}

function handleInsertBookmark(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { name, newRunId } = op.payload;

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before });
        }
        const bookmarkRun = createTextRun("", {}, undefined, undefined, name, name);
        if (newRunId) bookmarkRun.id = newRunId;
        nextChildren.push(bookmarkRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const bookmarkRun = createTextRun("", {}, undefined, undefined, name, name);
      if (newRunId) bookmarkRun.id = newRunId;
      nextChildren.push(bookmarkRun);
    }

    return { ...block, children: nextChildren };
  });

  return {
    ...nextState,
    selection: {
      anchor: { ...selection.anchor, offset: 0 },
      focus: { ...selection.focus, offset: 0 },
    },
  };
}

function handleInsertFootnote(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text, newRunId, newBlockId } = op.payload;

  const nextFootnoteId = String((state.document.footnotes?.length || 0) + 1);

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before, id: genId("run") });
        }
        const fnRun: TextRun = {
          id: newRunId || genId("run"),
          text: "",
          marks: { ...run.marks },
          footnoteId: nextFootnoteId,
        };
        nextChildren.push(fnRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after, id: genId("run") });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const fnRun: TextRun = {
        id: newRunId || genId("run"),
        text: "",
        marks: {},
        footnoteId: nextFootnoteId,
      };
      nextChildren.push(fnRun);
    }

    return { ...block, children: nextChildren };
  });

  const footnoteBlock = createParagraph(text);
  if (newBlockId) footnoteBlock.id = newBlockId;
  const footnotes = [...(nextState.document.footnotes || [])];
  footnotes.push({
    id: nextFootnoteId,
    blocks: [footnoteBlock],
  });

  return {
    ...nextState,
    document: {
      ...nextState.document,
      footnotes,
    },
  };
}

function handleInsertEndnote(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text, newRunId, newBlockId } = op.payload;

  const nextEndnoteId = String((state.document.endnotes?.length || 0) + 1);

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before, id: genId("run") });
        }
        const enRun: TextRun = {
          id: newRunId || genId("run"),
          text: "",
          marks: { ...run.marks },
          endnoteId: nextEndnoteId,
        };
        nextChildren.push(enRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after, id: genId("run") });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const enRun: TextRun = {
        id: newRunId || genId("run"),
        text: "",
        marks: {},
        endnoteId: nextEndnoteId,
      };
      nextChildren.push(enRun);
    }

    return { ...block, children: nextChildren };
  });

  const endnoteBlock = createParagraph(text);
  if (newBlockId) endnoteBlock.id = newBlockId;
  const endnotes = [...(nextState.document.endnotes || [])];
  endnotes.push({
    id: nextEndnoteId,
    blocks: [endnoteBlock],
  });

  return {
    ...nextState,
    document: {
      ...nextState.document,
      endnotes,
    },
  };
}

function handleInsertComment(state: EditorState, op: any): EditorState {
  const { selection } = state;
  if (!selection) return state;
  const { blockId, inlineId, offset } = selection.anchor;
  const { text, newRunId, newBlockId } = op.payload;

  const nextCommentId = String((state.document.comments?.length || 0) + 1);

  const nextState = updateDocumentSections(state, blockId, (block) => {
    if (!isTextBlock(block)) return block;
    const nextChildren: TextRun[] = [];
    let inserted = false;

    for (const run of block.children) {
      if (run.id === inlineId) {
        const before = run.text.slice(0, offset);
        const after = run.text.slice(offset);
        if (before) {
          nextChildren.push({ ...run, text: before, id: genId("run") });
        }
        const commentRun: TextRun = {
          id: newRunId || genId("run"),
          text: "",
          marks: { ...run.marks },
          commentId: nextCommentId,
        };
        nextChildren.push(commentRun);
        inserted = true;
        if (after) {
          nextChildren.push({ ...run, text: after, id: genId("run") });
        }
      } else {
        nextChildren.push(run);
      }
    }

    if (!inserted) {
      const commentRun: TextRun = {
        id: newRunId || genId("run"),
        text: "",
        marks: {},
        commentId: nextCommentId,
      };
      nextChildren.push(commentRun);
    }

    return { ...block, children: nextChildren };
  });

  const commentBlock = createParagraph(text);
  if (newBlockId) commentBlock.id = newBlockId;
  const comments = [...(nextState.document.comments || [])];
  comments.push({ id: nextCommentId, author: "Author", date: Date.now(), blocks: [commentBlock] });

  // Place cursor after the comment reference: prefer the next run, else stay in comment run
  let nextPosition = { ...selection.anchor, offset: 0 };
  const block = findBlockById(nextState.document, blockId);
  if (block && isTextBlock(block)) {
    let foundComment = false;
    for (const run of block.children) {
      if (run.commentId === nextCommentId) {
        foundComment = true;
        continue;
      }
      if (foundComment) {
        nextPosition = {
          ...selection.anchor,
          inlineId: run.id,
          offset: 0,
        };
        break;
      }
    }
  }

  return {
    ...nextState,
    document: {
      ...nextState.document,
      comments,
    },
    selection: { anchor: nextPosition, focus: nextPosition },
  };
}

export function registerAnnotationHandlers() {
  registerHandler(OperationType.INSERT_FIELD, handleInsertField);
  registerHandler(OperationType.INSERT_EQUATION, handleInsertEquation);
  registerHandler(OperationType.INSERT_BOOKMARK, handleInsertBookmark);
  registerHandler(OperationType.INSERT_FOOTNOTE, handleInsertFootnote);
  registerHandler(OperationType.INSERT_ENDNOTE, handleInsertEndnote);
  registerHandler(OperationType.INSERT_COMMENT, handleInsertComment);
}

import { OperationType, InsertFieldOp, InsertEquationOp, InsertBookmarkOp, InsertFootnoteOp, InsertEndnoteOp, InsertCommentOp } from "../../operations/OperationTypes.js";
import { EditorState } from "../EditorState.js";
import { registerHandler } from "../OperationHandlers.js";
import { isTextBlock } from "../../document/BlockTypes.js";
import { createId } from "../../utils/IdGenerator.js";
import { FieldUtils } from "../../document/FieldUtils.js";

function handleInsertField(state: EditorState, op: InsertFieldOp): EditorState {
  const { field } = op.payload;
  const { document, selection } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inline = block.children.find(i => i.id === anchor.inlineId);
  if (!inline) return state;

  const newInline = {
    ...inline,
    id: createId(),
    text: FieldUtils.getPlaceholder(field.type),
    field: {
      type: field.type,
      instruction: field.instruction
    }
  };

  const newBlock = {
    ...block,
    children: block.children.map(i => i.id === inline.id ? newInline : i)
  };

  const newSection = {
    ...section,
    children: section.children.map(b => b.id === block.id ? newBlock : b)
  };

  return {
    ...state,
    document: {
      ...document,
      sections: document.sections.map(s => s.id === section.id ? newSection : s)
    }
  };
}

function handleInsertEquation(state: EditorState, op: InsertEquationOp): EditorState {
  const { latex, display } = op.payload;
  const { document, selection } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const newBlock = {
    id: createId(),
    kind: "equation" as const,
    latex,
    display,
    align: display ? "center" as const : "left" as const
  };

  const blockIndex = section.children.findIndex(b => b.id === block.id);
  const newSection = {
    ...section,
    children: [
      ...section.children.slice(0, blockIndex + 1),
      newBlock,
      ...section.children.slice(blockIndex + 1)
    ]
  };

  return {
    ...state,
    document: {
      ...document,
      sections: document.sections.map(s => s.id === section.id ? newSection : s)
    }
  };
}

function handleInsertBookmark(state: EditorState, op: InsertBookmarkOp): EditorState {
  const { name } = op.payload;
  const { document, selection } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inline = block.children.find(i => i.id === anchor.inlineId);
  if (!inline) return state;

  const newInline = {
    ...inline,
    id: createId(),
    marks: {
      ...inline.marks,
      bookmark: name
    }
  };

  const newBlock = {
    ...block,
    children: block.children.map(i => i.id === inline.id ? newInline : i)
  };

  const newSection = {
    ...section,
    children: section.children.map(b => b.id === block.id ? newBlock : b)
  };

  return {
    ...state,
    document: {
      ...document,
      sections: document.sections.map(s => s.id === section.id ? newSection : s)
    }
  };
}

function handleInsertFootnote(state: EditorState, _op: InsertFootnoteOp): EditorState {
  const { document, selection } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inline = block.children.find(i => i.id === anchor.inlineId);
  if (!inline) return state;

  const footnoteId = createId();
  const newInline = {
    ...inline,
    id: createId(),
    footnoteId
  };

  const newFootnote = {
    id: footnoteId,
    blocks: [{
      id: createId(),
      kind: "paragraph" as const,
      align: "left" as const,
      children: [{ id: createId(), text: "", marks: {} }]
    }]
  };

  const newBlock = {
    ...block,
    children: block.children.map(i => i.id === inline.id ? newInline : i)
  };

  const newSection = {
    ...section,
    children: section.children.map(b => b.id === block.id ? newBlock : b)
  };

  return {
    ...state,
    document: {
      ...document,
      sections: document.sections.map(s => s.id === section.id ? newSection : s),
      footnotes: [...(document.footnotes || []), newFootnote]
    },
    editingFootnoteId: footnoteId
  };
}

function handleInsertEndnote(state: EditorState, _op: InsertEndnoteOp): EditorState {
  const { document, selection } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inline = block.children.find(i => i.id === anchor.inlineId);
  if (!inline) return state;

  const endnoteId = createId();
  const newInline = {
    ...inline,
    id: createId(),
    endnoteId
  };

  const newEndnote = {
    id: endnoteId,
    blocks: [{
      id: createId(),
      kind: "paragraph" as const,
      align: "left" as const,
      children: [{ id: createId(), text: "", marks: {} }]
    }]
  };

  const newBlock = {
    ...block,
    children: block.children.map(i => i.id === inline.id ? newInline : i)
  };

  const newSection = {
    ...section,
    children: section.children.map(b => b.id === block.id ? newBlock : b)
  };

  return {
    ...state,
    document: {
      ...document,
      sections: document.sections.map(s => s.id === section.id ? newSection : s),
      endnotes: [...(document.endnotes || []), newEndnote]
    }
  };
}

function handleInsertComment(state: EditorState, op: InsertCommentOp): EditorState {
  const { text } = op.payload;
  const { document, selection } = state;
  if (!selection) return state;
  const { anchor, focus } = selection;

  const commentId = createId();
  const newComment = {
    id: commentId,
    author: "Current User",
    date: Date.now(),
    blocks: [{
      id: createId(),
      kind: "paragraph" as const,
      align: "left" as const,
      children: [{ id: createId(), text, marks: {} }]
    }]
  };

  return {
    ...state,
    document: {
      ...document,
      comments: [...(document.comments || []), newComment]
    }
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

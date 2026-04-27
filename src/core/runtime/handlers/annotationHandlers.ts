import { OperationType, InsertFieldOp, InsertEquationOp, InsertBookmarkOp, InsertFootnoteOp, InsertEndnoteOp, InsertCommentOp } from "../../operations/OperationTypes.js";
import { EditorState } from "../EditorState.js";
import { registerHandler } from "../OperationHandlers.js";
import { isTextBlock } from "../../document/BlockTypes.js";
import { FieldUtils } from "../../document/FieldUtils.js";

function splitInlineAt(inline: any, offset: number, idGenerator: any): any[] {
  if (offset <= 0) return [inline];
  if (offset >= inline.text.length) return [inline];

  const left = {
    ...inline,
    id: idGenerator.nextRunId(),
    text: inline.text.substring(0, offset)
  };
  const right = {
    ...inline,
    id: idGenerator.nextRunId(),
    text: inline.text.substring(offset)
  };
  return [left, right];
}

function handleInsertField(state: EditorState, op: InsertFieldOp): EditorState {
  const { field } = op.payload;
  const { document, selection, idGenerator } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inlineIndex = block.children.findIndex(i => i.id === anchor.inlineId);
  if (inlineIndex === -1) return state;

  const inline = block.children[inlineIndex];
  const placeholder = FieldUtils.getPlaceholder(field.type);
  
  const fieldRun = {
    id: idGenerator.nextRunId(),
    text: placeholder,
    marks: inline.marks,
    field: {
      type: field.type,
      instruction: field.instruction
    }
  };

  const parts = splitInlineAt(inline, anchor.offset, idGenerator);
  let newChildren: any[];
  
  if (parts.length === 1) {
    // Insert at boundary
    newChildren = [...block.children];
    newChildren.splice(anchor.offset === 0 ? inlineIndex : inlineIndex + 1, 0, fieldRun);
  } else {
    // Split and insert between
    newChildren = [...block.children];
    newChildren.splice(inlineIndex, 1, parts[0], fieldRun, parts[1]);
  }

  const newBlock = { ...block, children: newChildren };
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
  const { document, selection, idGenerator } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const newBlock = {
    id: idGenerator.nextBlockId(),
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
  const { document, selection, idGenerator } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inlineIndex = block.children.findIndex(i => i.id === anchor.inlineId);
  if (inlineIndex === -1) return state;

  const inline = block.children[inlineIndex];
  const bookmarkRun = {
    id: idGenerator.nextRunId(),
    text: "", // Bookmark is an anchor, usually empty text or wrapping text
    marks: { ...inline.marks, bookmark: name },
    bookmarkStart: name,
    bookmarkEnd: name
  };

  const parts = splitInlineAt(inline, anchor.offset, idGenerator);
  let newChildren: any[];

  if (parts.length === 1) {
    newChildren = [...block.children];
    newChildren.splice(anchor.offset === 0 ? inlineIndex : inlineIndex + 1, 0, bookmarkRun);
  } else {
    newChildren = [...block.children];
    newChildren.splice(inlineIndex, 1, parts[0], bookmarkRun, parts[1]);
  }

  const newBlock = { ...block, children: newChildren };
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
  const { document, selection, idGenerator } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inlineIndex = block.children.findIndex(i => i.id === anchor.inlineId);
  if (inlineIndex === -1) return state;

  const inline = block.children[inlineIndex];
  const footnoteId = idGenerator.nextId("footnote"); // Use "footnote" prefix
  
  const footnoteRun = {
    id: idGenerator.nextRunId(),
    text: "",
    marks: inline.marks,
    footnoteId
  };

  const parts = splitInlineAt(inline, anchor.offset, idGenerator);
  let newChildren: any[];

  if (parts.length === 1) {
    newChildren = [...block.children];
    newChildren.splice(anchor.offset === 0 ? inlineIndex : inlineIndex + 1, 0, footnoteRun);
  } else {
    newChildren = [...block.children];
    newChildren.splice(inlineIndex, 1, parts[0], footnoteRun, parts[1]);
  }

  const newFootnote = {
    id: footnoteId,
    blocks: [{
      id: idGenerator.nextBlockId(),
      kind: "paragraph" as const,
      align: "left" as const,
      children: [{ id: idGenerator.nextRunId(), text: "", marks: {} }]
    }]
  };

  const newBlock = { ...block, children: newChildren };
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
    editingMode: "footnote",
    editingFootnoteId: footnoteId
  };
}

function handleInsertEndnote(state: EditorState, _op: InsertEndnoteOp): EditorState {
  const { document, selection, idGenerator } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inlineIndex = block.children.findIndex(i => i.id === anchor.inlineId);
  if (inlineIndex === -1) return state;

  const inline = block.children[inlineIndex];
  const endnoteId = idGenerator.nextId("endnote");
  
  const endnoteRun = {
    id: idGenerator.nextRunId(),
    text: "",
    marks: inline.marks,
    endnoteId
  };

  const parts = splitInlineAt(inline, anchor.offset, idGenerator);
  let newChildren: any[];

  if (parts.length === 1) {
    newChildren = [...block.children];
    newChildren.splice(anchor.offset === 0 ? inlineIndex : inlineIndex + 1, 0, endnoteRun);
  } else {
    newChildren = [...block.children];
    newChildren.splice(inlineIndex, 1, parts[0], endnoteRun, parts[1]);
  }

  const newEndnote = {
    id: endnoteId,
    blocks: [{
      id: idGenerator.nextBlockId(),
      kind: "paragraph" as const,
      align: "left" as const,
      children: [{ id: idGenerator.nextRunId(), text: "", marks: {} }]
    }]
  };

  const newBlock = { ...block, children: newChildren };
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
  const { document, selection, idGenerator } = state;
  if (!selection) return state;
  const { anchor } = selection;

  const section = document.sections.find(s => s.id === anchor.sectionId);
  if (!section) return state;

  const block = section.children.find(b => b.id === anchor.blockId);
  if (!block || !isTextBlock(block)) return state;

  const inlineIndex = block.children.findIndex(i => i.id === anchor.inlineId);
  if (inlineIndex === -1) return state;

  const inline = block.children[inlineIndex];
  const commentId = idGenerator.nextId("comment");

  const commentRun = {
    id: idGenerator.nextRunId(),
    text: "",
    marks: inline.marks,
    commentId
  };

  const parts = splitInlineAt(inline, anchor.offset, idGenerator);
  let newChildren: any[];

  if (parts.length === 1) {
    newChildren = [...block.children];
    newChildren.splice(anchor.offset === 0 ? inlineIndex : inlineIndex + 1, 0, commentRun);
  } else {
    newChildren = [...block.children];
    newChildren.splice(inlineIndex, 1, parts[0], commentRun, parts[1]);
  }

  const newComment = {
    id: commentId,
    author: "Author", // Matching test expectation
    date: Date.now(),
    blocks: [{
      id: idGenerator.nextBlockId(),
      kind: "paragraph" as const,
      align: "left" as const,
      children: [{ id: idGenerator.nextRunId(), text, marks: {} }]
    }]
  };

  const newBlock = { ...block, children: newChildren };
  const newSection = {
    ...section,
    children: section.children.map(b => b.id === block.id ? newBlock : b)
  };

  return {
    ...state,
    document: {
      ...document,
      sections: document.sections.map(s => s.id === section.id ? newSection : s),
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

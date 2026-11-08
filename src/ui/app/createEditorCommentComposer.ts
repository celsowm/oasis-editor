import { createSignal } from "solid-js";
import type { EditorState } from "@/core/model.js";
import { createEditorNodeId } from "@/core/editorState.js";
import { getSelectedReviewComment } from "@/core/commands/reviewNavigation.js";
import {
  getCommentRangeForSelection,
  insertCommentAtSelection,
  replyToComment,
  editCommentText,
} from "@/core/commands/commentAuthoring.js";

export interface CommentComposerDraft {
  mode: "new" | "reply" | "edit";
  /** Snapshot captured before modal focus steals the editor selection. */
  snapshot: EditorState;
  parentId?: string;
  parentAuthor?: string;
  parentText?: string;
  commentId?: string;
  commentAuthor?: string;
  commentText?: string;
}

export interface CommentComposerDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  applyTransactionalState: (change: (current: EditorState) => EditorState) => void;
  focusInput: () => void;
}

/** One instance per editor; never a global author, dialog, or comment state. */
export function createEditorCommentComposer(deps: CommentComposerDeps) {
  const [draft, setDraft] = createSignal<CommentComposerDraft | null>(null);
  const [lastAuthor, setLastAuthor] = createSignal("");

  const canCreate = (): boolean =>
    !deps.isReadOnly() && getCommentRangeForSelection(deps.state()) !== null;
  const canReply = (): boolean =>
    !deps.isReadOnly() && getSelectedReviewComment(deps.state()) !== null;
  const canEdit = canReply;

  const openNew = (): boolean => {
    if (!canCreate()) return false;
    setDraft({ mode: "new", snapshot: deps.state() });
    return true;
  };

  /** Reply to the hovered thread without requiring selection changes. */
  const openReplyToId = (parentId: string): boolean => {
    if (deps.isReadOnly()) return false;
    const snapshot = deps.state();
    const parent = snapshot.document.comments?.items[parentId];
    if (!parent) return false;
    setDraft({
      mode: "reply",
      snapshot,
      parentId: parent.id,
      parentAuthor: parent.author,
      parentText: parent.text,
    });
    return true;
  };

  const openReply = (): boolean => {
    if (!canReply()) return false;
    const parent = getSelectedReviewComment(deps.state());
    return parent ? openReplyToId(parent.id) : false;
  };

  /** An explicit comment id also allows editing an unanchored nested reply. */
  const openEditToId = (commentId: string): boolean => {
    if (deps.isReadOnly()) return false;
    const snapshot = deps.state();
    const comment = snapshot.document.comments?.items[commentId];
    if (!comment) return false;
    setDraft({
      mode: "edit",
      snapshot,
      commentId,
      commentAuthor: comment.author,
      commentText: comment.text,
    });
    return true;
  };

  const openEdit = (): boolean => {
    if (!canEdit()) return false;
    const selected = getSelectedReviewComment(deps.state());
    return selected ? openEditToId(selected.id) : false;
  };

  const close = (): void => {
    setDraft(null);
    deps.focusInput();
  };

  const submit = (author: string, text: string): boolean => {
    const pending = draft();
    if (!pending || deps.isReadOnly()) return false;
    const name = pending.mode === "edit"
      ? pending.commentAuthor?.trim() ?? ""
      : author.trim();
    const body = text.trim();
    if (!name || !body || deps.state().document !== pending.snapshot.document) {
      return false;
    }
    if (pending.mode === "edit" && pending.commentText === body) {
      close();
      return true;
    }
    const content = pending.mode === "edit" ? null : {
      id: createEditorNodeId("comment"),
      author: name,
      text: body,
      date: Date.now(),
    };
    let succeeded = false;
    deps.applyTransactionalState((current): EditorState => {
      // An external edit or document reload while the dialog is open invalidates
      // the captured anchors. Never write into a newer document accidentally.
      if (deps.isReadOnly() || current.document !== pending.snapshot.document) {
        return current;
      }
      const next = pending.mode === "edit"
        ? editCommentText(current, pending.commentId!, body)
        : pending.mode === "reply"
          ? replyToComment(current, pending.parentId!, content!)
          : insertCommentAtSelection(
              { ...current, selection: pending.snapshot.selection,
                activeSectionIndex: pending.snapshot.activeSectionIndex,
                activeZone: pending.snapshot.activeZone,
                activeFootnoteId: pending.snapshot.activeFootnoteId },
              content!,
            );
      succeeded = next.document !== current.document;
      return next;
    });
    if (succeeded) {
      if (pending.mode !== "edit") setLastAuthor(name);
      close();
    }
    return succeeded;
  };

  return {
    draft, lastAuthor, canCreate, canReply, canEdit,
    openNew, openReply, openReplyToId, openEdit, openEditToId, close, submit,
  };
}

export type EditorCommentComposer = ReturnType<typeof createEditorCommentComposer>;

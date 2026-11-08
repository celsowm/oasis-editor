import { createSignal } from "solid-js";
import type { EditorState, EditorReviewActivityKind } from "@/core/model.js";
import { createEditorNodeId } from "@/core/editorState.js";
import { appendReviewChange } from "@/core/commands/reviewActivity.js";
import {
  getSelectedReviewComment,
  deleteReviewCommentById,
  setReviewCommentResolvedById,
} from "@/core/commands/reviewNavigation.js";
import {
  canEditReviewComment,
  canDeleteReviewThread,
  type OasisReviewAccess,
} from "@/core/commands/commentPermissions.js";
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
  applyTransactionalState: (
    change: (current: EditorState) => EditorState,
  ) => void;
  focusInput: () => void;
  access?: () => OasisReviewAccess | undefined;
}

/** One instance per editor; never a global author, dialog, or comment state. */
export function createEditorCommentComposer(deps: CommentComposerDeps) {
  const [draft, setDraft] = createSignal<CommentComposerDraft | null>(null);
  const [lastAuthor, setLastAuthor] = createSignal("");
  const [panelOpen, setPanelOpen] = createSignal(false);
  const togglePanel = (): boolean => {
    setPanelOpen(!panelOpen());
    return true;
  };
  const closePanel = (): void => {
    setPanelOpen(false);
  };

  const access = (): OasisReviewAccess | undefined => deps.access?.();
  const actor = (): { id: string; displayName: string } | null => {
    const identity = access()?.identity;
    return identity?.id.trim() && identity.displayName.trim()
      ? { id: identity.id.trim(), displayName: identity.displayName.trim() }
      : null;
  };
  const mayWrite = (): boolean =>
    !deps.isReadOnly() && (!access() || actor() !== null);
  const canCreate = (): boolean =>
    mayWrite() && getCommentRangeForSelection(deps.state()) !== null;
  const canReplyId = (id: string): boolean =>
    mayWrite() && Boolean(deps.state().document.comments?.items[id]);
  const canReply = (): boolean =>
    mayWrite() && getSelectedReviewComment(deps.state()) !== null;
  const canEditId = (id: string): boolean =>
    !deps.isReadOnly() &&
    canEditReviewComment(access(), deps.state().document.comments?.items[id]);
  const canEdit = (): boolean => {
    const selected = getSelectedReviewComment(deps.state());
    return selected !== null && canEditId(selected.id);
  };
  const canDeleteId = (id: string): boolean =>
    !deps.isReadOnly() &&
    canDeleteReviewThread(access(), deps.state().document.comments, id);
  const canDeleteSelected = (): boolean => {
    const selected = getSelectedReviewComment(deps.state());
    return selected !== null && canDeleteId(selected.id);
  };
  const canResolveId = canEditId;
  const canResolveSelected = (): boolean => {
    const selected = getSelectedReviewComment(deps.state());
    return selected !== null && canResolveId(selected.id);
  };
  const authorName = (): string => actor()?.displayName ?? lastAuthor();
  const authorLocked = (): boolean => access() !== undefined;
  const recordedActor = (
    fallback = "Local editor",
  ): {
    actorName: string;
    actorId?: string;
  } => {
    const identity = actor();
    return identity
      ? { actorName: identity.displayName, actorId: identity.id }
      : { actorName: fallback };
  };
  const recordChange = (
    before: EditorState,
    after: EditorState,
    kind: EditorReviewActivityKind,
    commentId: string,
    fallbackActor?: string,
    parentId?: string,
  ): EditorState =>
    appendReviewChange(before, after, {
      id: createEditorNodeId("review-activity"),
      kind,
      commentId,
      ...recordedActor(fallbackActor),
      timestamp: Date.now(),
      ...(parentId ? { parentId } : {}),
    });

  const openNew = (): boolean => {
    if (!canCreate()) return false;
    setDraft({ mode: "new", snapshot: deps.state() });
    return true;
  };

  /** Reply to the hovered thread without requiring selection changes. */
  const openReplyToId = (parentId: string): boolean => {
    if (!canReplyId(parentId)) return false;
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
    if (!canEditId(commentId)) return false;
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
    if (pending.mode === "edit" && !canEditId(pending.commentId!)) return false;
    if (pending.mode !== "edit" && !mayWrite()) return false;
    const name =
      pending.mode === "edit"
        ? (pending.commentAuthor?.trim() ?? "")
        : (actor()?.displayName ?? author.trim());
    const body = text.trim();
    if (!name || !body || deps.state().document !== pending.snapshot.document) {
      return false;
    }
    if (pending.mode === "edit" && pending.commentText === body) {
      close();
      return true;
    }
    const content =
      pending.mode === "edit"
        ? null
        : {
            id: createEditorNodeId("comment"),
            author: name,
            ...(actor() ? { authorId: actor()!.id } : {}),
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
      if (
        pending.mode === "edit" &&
        !canEditReviewComment(
          access(),
          current.document.comments?.items[pending.commentId!],
        )
      ) {
        return current;
      }
      if (pending.mode !== "edit" && !mayWrite()) return current;
      const next =
        pending.mode === "edit"
          ? editCommentText(current, pending.commentId!, body)
          : pending.mode === "reply"
            ? replyToComment(current, pending.parentId!, content!)
            : insertCommentAtSelection(
                {
                  ...current,
                  selection: pending.snapshot.selection,
                  activeSectionIndex: pending.snapshot.activeSectionIndex,
                  activeZone: pending.snapshot.activeZone,
                  activeFootnoteId: pending.snapshot.activeFootnoteId,
                },
                content!,
              );
      succeeded = next.document !== current.document;
      if (!succeeded) return next;
      return recordChange(
        current,
        next,
        pending.mode === "new"
          ? "comment-created"
          : pending.mode === "reply"
            ? "comment-replied"
            : "comment-edited",
        pending.mode === "edit" ? pending.commentId! : content!.id,
        name,
        pending.mode === "reply" ? pending.parentId : undefined,
      );
    });
    if (succeeded) {
      if (pending.mode !== "edit") setLastAuthor(name);
      close();
    }
    return succeeded;
  };

  const deleteById = (id: string): boolean => {
    if (!canDeleteId(id)) return false;
    const before = deps.state();
    let changed = false;
    deps.applyTransactionalState((current): EditorState => {
      if (
        deps.isReadOnly() ||
        current.document !== before.document ||
        !canDeleteReviewThread(access(), current.document.comments, id)
      ) {
        return current;
      }
      const next = deleteReviewCommentById(current, id);
      changed = next.document !== current.document;
      return changed
        ? recordChange(current, next, "comment-deleted", id)
        : next;
    });
    return changed;
  };
  const deleteSelected = (): boolean => {
    const selected = getSelectedReviewComment(deps.state());
    return selected ? deleteById(selected.id) : false;
  };
  const resolveById = (id: string, resolved: boolean): boolean => {
    if (!canResolveId(id)) return false;
    const before = deps.state();
    let changed = false;
    deps.applyTransactionalState((current): EditorState => {
      if (
        deps.isReadOnly() ||
        current.document !== before.document ||
        !canEditReviewComment(access(), current.document.comments?.items[id])
      )
        return current;
      const next = setReviewCommentResolvedById(current, id, resolved);
      changed = next.document !== current.document;
      return changed
        ? recordChange(
            current,
            next,
            resolved ? "comment-resolved" : "comment-reopened",
            id,
          )
        : next;
    });
    return changed;
  };
  const resolveSelected = (resolved: boolean): boolean => {
    const selected = getSelectedReviewComment(deps.state());
    return selected ? resolveById(selected.id, resolved) : false;
  };

  return {
    draft,
    lastAuthor,
    panelOpen,
    togglePanel,
    closePanel,
    canCreate,
    canReply,
    canReplyId,
    canEdit,
    canEditId,
    canDeleteId,
    canDeleteSelected,
    deleteSelected,
    deleteById,
    canResolveId,
    canResolveSelected,
    resolveSelected,
    resolveById,
    authorName,
    authorLocked,
    openNew,
    openReply,
    openReplyToId,
    openEdit,
    openEditToId,
    close,
    submit,
  };
}

export type EditorCommentComposer = ReturnType<
  typeof createEditorCommentComposer
>;

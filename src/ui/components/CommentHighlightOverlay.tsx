import { For, Show, createMemo, createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { EditorComment } from "@/core/model.js";
import type { CommentHighlightBox } from "@/ui/editorUiTypes.js";
import { JSX } from "solid-js";
import { Button } from "@/ui/public/Button.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { collectCommentThreadReplies } from "@/core/commands/commentAuthoring.js";

export interface CommentHighlightOverlayProps {
  boxes: Accessor<CommentHighlightBox[]>;
  /** Comment bodies keyed by their editor-local id, for the hover popup. */
  commentsById: Accessor<Record<string, EditorComment>>;
  onReplyToComment?: (commentId: string) => void;
  onEditComment?: (commentId: string) => void;
  canEditComment?: (commentId: string) => boolean;
  canReplyComment?: (commentId: string) => boolean;
  readOnly?: boolean;
}

/**
 * Renders the highlight rectangles over commented text and, on hover/click of a
 * highlight, a small popup with the comment's author/date/text (mirroring the
 * track-changes `RevisionOverlay`). Hit-testing happens on the overlay divs
 * themselves (`pointer-events: auto`), so no canvas hit-test plumbing is needed.
 */
export function CommentHighlightOverlay(
  props: CommentHighlightOverlayProps,
): JSX.Element {
  const t = useI18n();
  const [activeCommentId, setActiveCommentId] = createSignal<string | null>(
    null,
  );
  const [expandedCommentId, setExpandedCommentId] = createSignal<string | null>(
    null,
  );

  const activeComment = createMemo<EditorComment | null>(
    (): EditorComment | null => {
      const id = activeCommentId();
      if (!id) return null;
      return props.commentsById()[id] ?? null;
    },
  );

  const replies = createMemo(() =>
    collectCommentThreadReplies(
      props.commentsById(),
      activeCommentId() ?? "",
    ),
  );

  const visibleReplies = createMemo(() =>
    expandedCommentId() === activeCommentId()
      ? replies()
      : replies().slice(0, 3),
  );

  // Anchor the popup to the first (top-most) highlight box of the active comment.
  const popupAnchor = createMemo<CommentHighlightBox | null>(
    (): CommentHighlightBox | null => {
      const id = activeCommentId();
      if (!id) return null;
      let best: CommentHighlightBox | null = null;
      for (const box of props.boxes()) {
        if (box.commentId !== id) continue;
        if (!best || box.top < best.top) best = box;
      }
      return best;
    },
  );

  const formattedDate = (date: number | undefined): string => {
    if (date === undefined) return "";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <div class="oasis-editor-comment-overlay-root">
      <For each={props.boxes()}>
        {(box): JSX.Element => (
          <span
            class="oasis-editor-comment-highlight"
            classList={{
              "oasis-editor-comment-highlight-active":
                activeCommentId() === box.commentId,
            }}
            data-testid="editor-comment-highlight"
            data-comment-id={box.commentId}
            role="button"
            tabIndex={0}
            aria-label={`${t("comment.body")}: ${props.commentsById()[box.commentId]?.author ?? ""}`}
            onFocus={(): string => setActiveCommentId(box.commentId)}
            onKeyDown={(event): void => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveCommentId(box.commentId);
              }
            }}
            style={{
              left: `${box.left}px`,
              top: `${box.top}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
            }}
            onMouseEnter={(): string => setActiveCommentId(box.commentId)}
            onClick={(): string => setActiveCommentId(box.commentId)}
          />
        )}
      </For>

      <Show when={activeComment() && popupAnchor()}>
        <div
              class="oasis-editor-comment-popup"
              data-testid="editor-comment-popup"
              style={{
                left: `${popupAnchor()?.left ?? 0}px`,
                top: `${(popupAnchor()?.top ?? 0) + (popupAnchor()?.height ?? 0) + 6}px`,
              }}
              onMouseLeave={(): null => setActiveCommentId(null)}
            >
              <div class="oasis-editor-comment-popup-header">
                <span class="oasis-editor-comment-popup-author">
                  {activeComment()?.author || "—"}
                </span>
                <Show when={activeComment()?.date !== undefined}>
                  <span class="oasis-editor-comment-popup-date">
                    {formattedDate(activeComment()?.date)}
                  </span>
                </Show>
                <Show when={activeComment()?.resolved}>
                  <span class="oasis-editor-comment-popup-resolved">✓</span>
                </Show>
              </div>
              <div class="oasis-editor-comment-popup-body">{activeComment()?.text}</div>
              <Show when={replies().length > 0}>
                <div class="oasis-editor-comment-popup-replies" data-testid="comment-thread-replies">
                  <For each={visibleReplies()}>
                    {(reply): JSX.Element => (
                      <div class="oasis-editor-comment-popup-reply" data-comment-id={reply.id}>
                        <div class="oasis-editor-comment-popup-header">
                          <span class="oasis-editor-comment-popup-author">{reply.author}</span>
                          <Show when={reply.date !== undefined}>
                            <span class="oasis-editor-comment-popup-date">
                              {formattedDate(reply.date)}
                            </span>
                          </Show>
                          <Show when={reply.resolved}>
                            <span class="oasis-editor-comment-popup-resolved">✓</span>
                          </Show>
                        </div>
                        <div class="oasis-editor-comment-popup-body">{reply.text}</div>
                        <Show when={!props.readOnly}>
                          <div class="oasis-editor-comment-popup-actions">
                            <Show when={props.onEditComment &&
                              (!props.canEditComment || props.canEditComment(reply.id))}>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid="comment-popup-edit-reply"
                                onClick={(): void => props.onEditComment?.(reply.id)}
                              >
                                {t("toolbar.editComment")}
                              </Button>
                            </Show>
                            <Show when={props.onReplyToComment &&
                              (!props.canReplyComment || props.canReplyComment(reply.id))}>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid="comment-popup-reply-to-reply"
                                onClick={(): void => props.onReplyToComment?.(reply.id)}
                              >
                                {t("toolbar.replyComment")}
                              </Button>
                            </Show>
                          </div>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
                <Show when={replies().length > 3}>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-expanded={expandedCommentId() === activeCommentId()}
                    onClick={(): void => {
                      setExpandedCommentId(
                        expandedCommentId() === activeCommentId()
                          ? null
                          : activeCommentId(),
                      );
                    }}
                    data-testid="comment-popup-expand-replies"
                  >
                    {expandedCommentId() === activeCommentId()
                      ? t("comment.showFewerReplies")
                      : `${t("comment.showAllReplies")} (${replies().length})`}
                  </Button>
                </Show>
              </Show>
              <Show when={!props.readOnly}>
                <div class="oasis-editor-comment-popup-actions">
                  <Show when={props.onEditComment && (!props.canEditComment ||
                    (activeComment()?.id && props.canEditComment(activeComment()!.id)))}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(): void => {
                        const id = activeComment()?.id;
                        if (id) props.onEditComment?.(id);
                      }}
                      data-testid="comment-popup-edit"
                    >
                      {t("toolbar.editComment")}
                    </Button>
                  </Show>
                  <Show when={props.onReplyToComment && (!props.canReplyComment ||
                    (activeComment()?.id && props.canReplyComment(activeComment()!.id)))}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(): void => {
                        const id = activeComment()?.id;
                        if (id) props.onReplyToComment?.(id);
                      }}
                      data-testid="comment-popup-reply"
                    >
                      {t("toolbar.replyComment")}
                    </Button>
                  </Show>
                </div>
              </Show>
            </div>
      </Show>
    </div>
  );
}

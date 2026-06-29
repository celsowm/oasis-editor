import { For, Show, createMemo, createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { EditorComment } from "@/core/model.js";
import type { CommentHighlightBox } from "@/ui/editorUiTypes.js";
import { JSX } from "solid-js";

export interface CommentHighlightOverlayProps {
  boxes: Accessor<CommentHighlightBox[]>;
  /** Comment bodies keyed by their editor-local id, for the hover popup. */
  commentsById: Accessor<Record<string, EditorComment>>;
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
  const [activeCommentId, setActiveCommentId] = createSignal<string | null>(
    null,
  );

  const activeComment = createMemo<EditorComment | null>(
    (): EditorComment | null => {
      const id = activeCommentId();
      if (!id) return null;
      return props.commentsById()[id] ?? null;
    },
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
    <div aria-hidden="true" class="oasis-editor-comment-overlay-root">
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
        {((): JSX.Element => {
          const comment = activeComment()!;
          const anchor = popupAnchor()!;
          return (
            <div
              class="oasis-editor-comment-popup"
              data-testid="editor-comment-popup"
              style={{
                left: `${anchor.left}px`,
                top: `${anchor.top + anchor.height + 6}px`,
              }}
              onMouseLeave={(): null => setActiveCommentId(null)}
            >
              <div class="oasis-editor-comment-popup-header">
                <span class="oasis-editor-comment-popup-author">
                  {comment.author || "—"}
                </span>
                <Show when={comment.date !== undefined}>
                  <span class="oasis-editor-comment-popup-date">
                    {formattedDate(comment.date)}
                  </span>
                </Show>
                <Show when={comment.resolved}>
                  <span class="oasis-editor-comment-popup-resolved">✓</span>
                </Show>
              </div>
              <div class="oasis-editor-comment-popup-body">{comment.text}</div>
            </div>
          );
        })()}
      </Show>
    </div>
  );
}

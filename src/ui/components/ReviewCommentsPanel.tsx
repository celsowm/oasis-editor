import {
  For,
  Show,
  createMemo,
  createSignal,
  type Accessor,
  type JSX,
} from "solid-js";
import type {
  EditorComment,
  EditorComments,
  EditorReviewActivity,
  EditorState,
} from "@/core/model.js";
import { collectCommentThreadReplies } from "@/core/commands/commentAuthoring.js";
import type { EditorCommentComposer } from "@/ui/app/createEditorCommentComposer.js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { Locale } from "@/i18n/index.js";
import { Button } from "@/ui/public/Button.js";
import { TextField } from "@/ui/public/TextField.js";
import { Text } from "@/ui/public/Text.js";

export interface ReviewCommentsPanelProps {
  state: Accessor<EditorState>;
  composer: EditorCommentComposer;
  onNavigate: (id: string) => void;
  onClose: () => void;
  /** Active UI locale, so timestamps render in the app language, not the OS one. */
  locale?: () => Locale;
}
type Filter = "all" | "open" | "resolved";

/** All thread actions share the command-side permission controller. */
export function ReviewCommentsPanel(
  props: ReviewCommentsPanelProps,
): JSX.Element {
  const t = useI18n();
  const [filter, setFilter] = createSignal<Filter>("all");
  const [showActivity, setShowActivity] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = createSignal<string | null>(
    null,
  );

  const registry = (): EditorComments | undefined =>
    props.state().document.comments;
  const threads = createMemo((): EditorComment[] => {
    const comments = registry();
    if (!comments) return [];
    const query = search().trim().toLocaleLowerCase();
    return comments.order
      .map((id) => comments.items[id])
      .filter((comment): comment is EditorComment =>
        Boolean(
          comment && (!comment.parentId || !comments.items[comment.parentId]),
        ),
      )
      .filter((comment) => {
        if (filter() === "open" && comment.resolved) return false;
        if (filter() === "resolved" && !comment.resolved) return false;
        if (!query) return true;
        const entries = [
          comment,
          ...collectCommentThreadReplies(comments.items, comment.id),
        ];
        return entries.some((entry) =>
          (entry.text + " " + entry.author).toLocaleLowerCase().includes(query),
        );
      });
  });
  const replies = (id: string): EditorComment[] =>
    collectCommentThreadReplies(registry()?.items ?? {}, id);
  const activity = createMemo((): EditorReviewActivity[] => {
    const query = search().trim().toLocaleLowerCase();
    return [...(props.state().document.reviewActivity ?? [])]
      .filter(
        (entry) =>
          !query ||
          (entry.actorName + " " + entry.targetAuthor + " " + entry.kind)
            .toLocaleLowerCase()
            .includes(query),
      )
      .reverse();
  });
  const activityLabel = (kind: EditorReviewActivity["kind"]): string => {
    switch (kind) {
      case "comment-created":
        return t("review.activity.created");
      case "comment-replied":
        return t("review.activity.replied");
      case "comment-edited":
        return t("review.activity.edited");
      case "comment-resolved":
        return t("review.activity.resolved");
      case "comment-reopened":
        return t("review.activity.reopened");
      case "comment-deleted":
        return t("review.activity.deleted");
    }
  };
  // Matches the I18nProvider fallback so isolated rendering stays pt-BR.
  const locale = (): Locale => props.locale?.() ?? "pt-BR";
  const eventDate = (timestamp: number): string =>
    Number.isFinite(timestamp)
      ? new Date(timestamp).toLocaleString(locale())
      : "";

  const applyDelete = (id: string): void => {
    if (deleteCandidate() !== id) {
      setDeleteCandidate(id);
      return;
    }
    if (props.composer.deleteById(id)) {
      setDeleteCandidate(null);
      if (expandedId() === id) setExpandedId(null);
    }
  };

  return (
    <div
      role="region"
      class="oasis-review-comments-panel"
      aria-label={t("review.commentsPanel")}
      data-testid="review-comments-panel"
    >
      <div class="oasis-review-comments-heading">
        <Text as="strong">{t("review.commentsPanel")}</Text>
        <Button
          size="sm"
          variant="ghost"
          onClick={props.onClose}
          data-testid="review-comments-close"
          aria-label={t("generic.close")}
        >
          ✕
        </Button>
      </div>
      <div
        class="oasis-review-mode-switch"
        role="group"
        aria-label={t("review.displayMode")}
      >
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={!showActivity()}
          onClick={(): void => {
            setShowActivity(false);
          }}
          data-testid="review-show-discussions"
        >
          {t("review.commentsPanel")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={showActivity()}
          onClick={(): void => {
            setShowActivity(true);
          }}
          data-testid="review-show-activity"
        >
          {t("review.activity.title")}
        </Button>
      </div>
      <Text as="p">
        {showActivity()
          ? `${t("review.activity.title")}: ${props.state().document.reviewActivity?.length ?? 0}`
          : `${t("review.discussionCount")}: ${registry()?.order.length ?? 0}`}
      </Text>
      <TextField
        label={
          showActivity()
            ? t("review.activity.search")
            : t("review.searchComments")
        }
        value={search()}
        onChange={setSearch}
        data-testid="review-comments-search"
      />
      <Show when={!showActivity()}>
        <div
          class="oasis-review-comments-filters"
          role="group"
          aria-label={t("review.filterComments")}
        >
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={filter() === "all"}
            onClick={(): void => {
              setFilter("all");
            }}
          >
            {t("review.filterAll")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={filter() === "open"}
            onClick={(): void => {
              setFilter("open");
            }}
          >
            {t("review.filterOpen")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={filter() === "resolved"}
            onClick={(): void => {
              setFilter("resolved");
            }}
          >
            {t("review.filterResolved")}
          </Button>
        </div>
        <div class="oasis-review-comments-list">
          <Show when={threads().length === 0}>
            <Text as="p">{t("review.noComments")}</Text>
          </Show>
          <For each={threads()}>
            {(comment): JSX.Element => (
              <div class="oasis-review-thread" data-comment-id={comment.id}>
                <div class="oasis-review-thread-header">
                  <Text as="strong">{comment.author || "—"}</Text>
                  <Text as="span">
                    {comment.resolved
                      ? t("review.filterResolved")
                      : t("review.filterOpen")}
                  </Text>
                </div>
                <Text as="p">{comment.text}</Text>
                <div class="oasis-review-thread-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(): void => props.onNavigate(comment.id)}
                    data-testid="review-comment-navigate"
                  >
                    {t("review.goToComment")}
                  </Button>
                  <Show when={props.composer.canEditId(comment.id)}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(): void => {
                        props.composer.openEditToId(comment.id);
                      }}
                      data-testid="review-comment-edit"
                    >
                      {t("toolbar.editComment")}
                    </Button>
                  </Show>
                  <Show when={props.composer.canResolveId(comment.id)}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(): void => {
                        props.composer.resolveById(
                          comment.id,
                          !comment.resolved,
                        );
                      }}
                      data-testid="review-comment-resolve"
                    >
                      {comment.resolved
                        ? t("toolbar.reopenComment")
                        : t("toolbar.resolveComment")}
                    </Button>
                  </Show>
                  <Show when={props.composer.canReplyId(comment.id)}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(): void => {
                        props.composer.openReplyToId(comment.id);
                      }}
                      data-testid="review-comment-reply"
                    >
                      {t("toolbar.replyComment")}
                    </Button>
                  </Show>
                  <Show when={props.composer.canDeleteId(comment.id)}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(): void => applyDelete(comment.id)}
                      data-testid="review-comment-delete"
                    >
                      {deleteCandidate() === comment.id
                        ? t("review.confirmDelete")
                        : t("toolbar.deleteComment")}
                    </Button>
                    <Show when={deleteCandidate() === comment.id}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(): void => {
                          setDeleteCandidate(null);
                        }}
                      >
                        {t("generic.cancel")}
                      </Button>
                    </Show>
                  </Show>
                </div>
                <Show when={replies(comment.id).length > 0}>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-expanded={expandedId() === comment.id}
                    data-testid="review-toggle-replies"
                    onClick={(): void => {
                      setExpandedId(
                        expandedId() === comment.id ? null : comment.id,
                      );
                    }}
                  >
                    {expandedId() === comment.id
                      ? t("comment.showFewerReplies")
                      : `${t("comment.showAllReplies")} (${replies(comment.id).length})`}
                  </Button>
                </Show>
                <Show when={expandedId() === comment.id}>
                  <div class="oasis-review-thread-replies">
                    <For each={replies(comment.id)}>
                      {(reply): JSX.Element => (
                        <div
                          class="oasis-review-reply"
                          data-comment-id={reply.id}
                        >
                          <Text as="strong">{reply.author || "—"}</Text>
                          <Text as="p">{reply.text}</Text>
                          <div class="oasis-review-thread-actions">
                            <Show when={props.composer.canEditId(reply.id)}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(): void => {
                                  props.composer.openEditToId(reply.id);
                                }}
                                data-testid="review-reply-edit"
                              >
                                {t("toolbar.editComment")}
                              </Button>
                            </Show>
                            <Show when={props.composer.canReplyId(reply.id)}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(): void => {
                                  props.composer.openReplyToId(reply.id);
                                }}
                              >
                                {t("toolbar.replyComment")}
                              </Button>
                            </Show>
                            <Show when={props.composer.canDeleteId(reply.id)}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(): void => applyDelete(reply.id)}
                                data-testid="review-reply-delete"
                              >
                                {deleteCandidate() === reply.id
                                  ? t("review.confirmDelete")
                                  : t("toolbar.deleteComment")}
                              </Button>
                              <Show when={deleteCandidate() === reply.id}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(): void => {
                                    setDeleteCandidate(null);
                                  }}
                                >
                                  {t("generic.cancel")}
                                </Button>
                              </Show>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
      <Show when={showActivity()}>
        <div
          class="oasis-review-activity-list"
          data-testid="review-activity-list"
          role="list"
          aria-label={t("review.activity.title")}
        >
          <Show when={activity().length === 0}>
            <Text as="p">{t("review.activity.empty")}</Text>
          </Show>
          <For each={activity()}>
            {(entry): JSX.Element => (
              <div
                class="oasis-review-activity-entry"
                role="listitem"
                data-testid="review-activity-entry"
                data-activity-kind={entry.kind}
              >
                <div class="oasis-review-activity-heading">
                  <Text as="strong">{entry.actorName}</Text>
                  <Text as="span">{eventDate(entry.timestamp)}</Text>
                </div>
                <Text as="p">
                  {activityLabel(entry.kind)} — {entry.targetAuthor}
                  {entry.affectedCount && entry.affectedCount > 1
                    ? ` (${entry.affectedCount})`
                    : ""}
                </Text>
                <Show when={Boolean(registry()?.items[entry.commentId])}>
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid="review-activity-navigate"
                    onClick={(): void => props.onNavigate(entry.commentId)}
                  >
                    {t("review.goToComment")}
                  </Button>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

import {
  For,
  Show,
  createEffect,
  createMemo,
  type Accessor,
  type JSX,
} from "solid-js";
import type { EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { collectNavigableRevisions } from "@/core/commands/reviewNavigation.js";
import { isRevisionMarkupShown } from "@/core/commands/reviewMarkup.js";
import {
  collectSectionRevisions,
  collectTableRevisions,
} from "@/core/commands/cellRevisions.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/public/Button.js";
import { Text } from "@/ui/public/Text.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";

export interface ReviewingPaneProps {
  state: Accessor<EditorState>;
  onNavigate: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
  /** Scroll offset restored into the revision list once it can scroll. */
  scrollTop?: number;
  /** Reports the revision list's scroll offset so the host can persist it. */
  onScroll?: (scrollTop: number) => void;
}

interface dateAndType {
  date: number | undefined;
  type: string;
}

interface RevisionEntry {
  id: string;
  type: string;
  author: string;
  date: number | undefined;
  snippet: string;
  /** Row describes a section-level `w:sectPrChange` revision. */
  section?: boolean;
}

/** The revision's own text (all runs bearing its text or formatting id). */
function revisionSnippet(state: EditorState, id: string): string {
  const paragraphs = getParagraphs(state);
  const parts: string[] = [];
  for (const paragraph of paragraphs) {
    for (const run of paragraph.runs) {
      if (run.revision?.id === id || run.styles?.propertyRevision?.id === id) {
        parts.push(run.text);
      }
    }
  }
  const text = parts.join("").trim();
  return text.length > 96 ? `${text.slice(0, 93)}…` : text;
}

/**
 * Reviewing Pane: a right-side drawer listing every tracked change with
 * author, date and text, and one-click Accept / Reject per change plus
 * Accept All / Reject All at the footer. Mirrors Word's Reviewing Pane in
 * scope; Accept All / Reject All open the existing confirmation dialog.
 */
export function ReviewingPane(props: ReviewingPaneProps): JSX.Element {
  const t = useI18n();
  const allEntries = createMemo((): RevisionEntry[] => {
    const state = props.state();
    const paragraphs = getParagraphs(state);
    const authorById = new Map<string, string>();
    const dateById = new Map<string, dateAndType>();
    for (const paragraph of paragraphs) {
      for (const run of paragraph.runs) {
        const revision = run.revision;
        if (revision) {
          if (!authorById.has(revision.id)) {
            authorById.set(revision.id, revision.author);
          }
          if (!dateById.has(revision.id)) {
            dateById.set(revision.id, {
              date: revision.date,
              type: revision.type,
            });
          }
        }
        const property = run.styles?.propertyRevision;
        if (property) {
          if (!authorById.has(property.id)) {
            authorById.set(property.id, property.author);
          }
          if (!dateById.has(property.id)) {
            dateById.set(property.id, {
              date: property.date,
              type: "property",
            });
          }
        }
      }
    }
    // Cell-level revisions live on the cell's style, not on any run, so the
    // run-based maps above cannot describe them. Their ids still appear in
    // collectNavigableRevisions; fill in author/date/type/snippet here.
    const tableById = new Map(
      collectTableRevisions(state).map((entry) => [entry.id, entry]),
    );
    // Section-level `w:sectPrChange` revisions also live off-run; fill their
    // author/date/type/snippet from the section walker (same seam as tables).
    const sectionById = new Map(
      collectSectionRevisions(state).map((entry) => [entry.id, entry]),
    );
    return collectNavigableRevisions(state).map((range) => {
      const meta = dateById.get(range.id);
      const table = tableById.get(range.id);
      const section = sectionById.get(range.id);
      return {
        id: range.id,
        type: meta?.type ?? table?.type ?? section?.type ?? "insert",
        author:
          authorById.get(range.id) ?? table?.author ?? section?.author ?? "—",
        date: meta?.date ?? table?.date ?? section?.date,
        snippet:
          revisionSnippet(state, range.id) ||
          table?.snippet ||
          section?.snippet ||
          "",
        section: section !== undefined,
      };
    });
  });

  // Word's Show Markup filters govern the Reviewing Pane too: hiding a
  // revision category or a reviewer hides their rows from the list. Accept /
  // Reject All still address the whole document (they are bulk decisions).
  const entries = createMemo((): RevisionEntry[] => {
    const state = props.state();
    return allEntries().filter((entry): boolean =>
      isRevisionMarkupShown(state, entry.type, entry.author),
    );
  });
  const hiddenCount = (): number => allEntries().length - entries().length;

  // Persisted scroll offset: restore it once the list has enough rows to
  // scroll. An open pane is mounted before the document finishes loading, so
  // the first attempt can see a short list; the effect retries as rows arrive
  // (and stops for good once a restore succeeds, so later Accept/Reject row
  // changes never yank the user's position).
  let listElement: HTMLUListElement | undefined;
  let restoredScroll = false;
  const restoreScroll = (): void => {
    const element = listElement;
    const restore = props.scrollTop;
    if (!element || typeof restore !== "number" || restore <= 0) return;
    if (element.scrollHeight <= element.clientHeight) return;
    element.scrollTop = restore;
    restoredScroll = true;
    // The browser clamps to the current scroll height; persist the real value.
    if (element.scrollTop !== restore) props.onScroll?.(element.scrollTop);
  };
  createEffect((): void => {
    entries().length;
    if (restoredScroll) return;
    queueMicrotask(restoreScroll);
  });

  const typeLabel = (type: string, section?: boolean): string => {
    if (section) return t("review.revisionSection");
    if (type === "insert" || type === "delete")
      return type === "insert"
        ? t("review.revisionInsert")
        : t("review.revisionDelete");
    if (type === "grid") return t("review.revisionGrid");
    return t("review.revisionProperty");
  };

  const typeIcon = (type: string): string =>
    type === "delete" ? "minus" : type === "insert" ? "plus" : "pencil";

  const typeIconClass = (type: string, section?: boolean): string =>
    section
      ? "review-revisions-icon-section"
      : type === "delete"
        ? "review-revisions-icon-delete"
        : type === "property"
          ? "review-revisions-icon-property"
          : type === "grid"
            ? "review-revisions-icon-grid"
            : "review-revisions-icon-insert";

  return (
    <div
      role="region"
      class="oasis-review-comments-panel oasis-review-revisions-panel"
      aria-label={t("review.reviewingPane")}
      data-testid="review-revisions-panel"
    >
      <div class="oasis-review-comments-heading">
        <Text as="strong">{t("review.reviewingPane")}</Text>
        <Button
          size="sm"
          variant="ghost"
          onClick={props.onClose}
          data-testid="review-revisions-close"
          aria-label={t("generic.close")}
        >
          ✕
        </Button>
      </div>

      <Text as="p">
        {t("review.revisionCount")}: {entries().length}
      </Text>
      <Show when={hiddenCount() > 0}>
        <Text
          as="p"
          class="oasis-review-revisions-filtered"
          data-testid="review-revisions-filtered"
        >
          {t("review.revisionsHiddenByShowMarkup")}
        </Text>
      </Show>

      <Show
        when={entries().length > 0}
        fallback={<Text as="p">{t("review.noRevisions")}</Text>}
      >
        <ul
          class="oasis-review-revisions-list"
          data-testid="review-revisions-list"
          ref={(element): void => {
            listElement = element;
            queueMicrotask(restoreScroll);
          }}
          onScroll={(event): void => {
            props.onScroll?.(event.currentTarget.scrollTop);
          }}
        >
          <For each={entries()}>
            {(item): JSX.Element => (
              <li
                class="oasis-review-revision-item"
                data-comment-id={item.id}
                data-revision-section={item.section ? "true" : undefined}
              >
                <div class="oasis-review-revision-body">
                  <Text
                    as="span"
                    class={`oasis-review-revision-type ${typeIconClass(item.type, item.section)}`}
                    data-revision-type={item.type}
                  >
                    <ToolIcon name={typeIcon(item.type)} />
                    <Text as="span">{typeLabel(item.type, item.section)}</Text>
                  </Text>
                  <Text as="p">{item.snippet || "—"}</Text>
                  <Text as="span">{item.author}</Text>
                </div>
                <div class="oasis-review-revision-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(): void => props.onNavigate(item.id)}
                    data-testid="review-revision-navigate"
                  >
                    {t("review.goToComment")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(): void => props.onAccept(item.id)}
                    data-testid="review-revision-accept"
                  >
                    {t("toolbar.accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(): void => props.onReject(item.id)}
                    data-testid="review-revision-reject"
                  >
                    {t("toolbar.reject")}
                  </Button>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={entries().length > 0}>
        <div class="oasis-review-revision-footer">
          <Button
            size="sm"
            variant="ghost"
            onClick={props.onRejectAll}
            data-testid="review-revisions-reject-all"
          >
            {t("toolbar.rejectAll")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={props.onAcceptAll}
            data-testid="review-revisions-accept-all"
          >
            {t("toolbar.acceptAll")}
          </Button>
        </div>
      </Show>
    </div>
  );
}

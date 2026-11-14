import { For, Show, createMemo, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { CheckIcon } from "@/ui/utils/customIcons.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import type {
  MarkupOptionsSnapshot,
  ShowMarkupPayload,
} from "@/core/commands/reviewMarkup.js";

export interface ShowMarkupButtonProps {
  api: ToolbarActionApi;
}

const EMPTY_OPTIONS: MarkupOptionsSnapshot = {
  insertions: true,
  deletions: true,
  comments: true,
  allAuthors: true,
  visibleAuthors: [],
  knownAuthors: [],
};

const SECTIONS = [
  { section: "insertions", labelKey: "review.showMarkupInsertions" },
  { section: "deletions", labelKey: "review.showMarkupDeletions" },
  { section: "comments", labelKey: "review.showMarkupComments" },
] as const;

function optionsOf(api: ToolbarActionApi): MarkupOptionsSnapshot {
  const value = api.commands.state("showMarkupOptions").value;
  return (value as MarkupOptionsSnapshot | undefined) ?? EMPTY_OPTIONS;
}

interface MarkupCheckboxProps {
  label: string;
  checked: boolean | "mixed";
  testId: string;
  onClick: () => void;
  author?: string;
}

/** One Word-style Show Markup checkbox row in the dropdown. */
function MarkupCheckbox(props: MarkupCheckboxProps): JSX.Element {
  return (
    <button
      type="button"
      class="oasis-editor-line-spacing-item"
      classList={{
        "oasis-editor-line-spacing-item-active": props.checked === true,
      }}
      role="menuitemcheckbox"
      aria-checked={props.checked}
      data-testid={props.testId}
      data-author={props.author}
      onClick={props.onClick}
    >
      <span class="oasis-editor-line-spacing-item-check" aria-hidden="true">
        <Show when={props.checked === true}>
          <CheckIcon size={14} />
        </Show>
      </span>
      <span class="oasis-editor-line-spacing-item-label">{props.label}</span>
    </button>
  );
}

/**
 * Show Markup gallery (Review > Tracking). Word filters the *display* of
 * tracked changes per category and per reviewer without editing the revision
 * data; the menu reads a reactive snapshot from the command bus and dispatches
 * one `applyShowMarkup` action per checkbox.
 */
export function ShowMarkupButton(props: ShowMarkupButtonProps): JSX.Element {
  const t = useI18n();
  const api = props.api;
  // `commands.state` reads the live editor state through the Essentials
  // formatting capability, so this memo tracks view-flag changes.
  const options = createMemo((): MarkupOptionsSnapshot => optionsOf(api));
  const apply = (payload: ShowMarkupPayload): void => {
    api.commands.execute("applyShowMarkup", payload);
    api.focusEditor();
  };
  const sectionChecked = (
    section: (typeof SECTIONS)[number]["section"],
  ): boolean => {
    const current = options();
    if (section === "insertions") return current.insertions;
    if (section === "deletions") return current.deletions;
    return current.comments;
  };
  const reviewerChecked = (author: string): boolean =>
    options().allAuthors || options().visibleAuthors.includes(author);
  const allReviewersChecked = (): boolean | "mixed" => {
    const current = options();
    if (current.allAuthors) return true;
    return current.visibleAuthors.length === 0 ? false : "mixed";
  };

  return (
    <Menu
      icon="list-checks"
      testId="editor-toolbar-show-markup"
      tooltip={t("review.showMarkup")}
      panelClass="oasis-editor-show-markup-menu"
      fitViewport
    >
      <div class="oasis-editor-toolbar-list-options oasis-editor-show-markup-options">
        <For each={SECTIONS}>
          {(item): JSX.Element => (
            <MarkupCheckbox
              label={t(item.labelKey)}
              checked={sectionChecked(item.section)}
              testId={`editor-toolbar-show-markup-${item.section}`}
              onClick={(): void => apply({ section: item.section })}
            />
          )}
        </For>
        <div class="oasis-editor-line-spacing-menu-separator" />
        <MarkupCheckbox
          label={t("review.showMarkupAllReviewers")}
          checked={allReviewersChecked()}
          testId="editor-toolbar-show-markup-all-reviewers"
          onClick={(): void =>
            apply({ allAuthors: options().allAuthors !== true })
          }
        />
        <For each={options().knownAuthors}>
          {(author, index): JSX.Element => (
            <MarkupCheckbox
              label={author}
              checked={reviewerChecked(author)}
              testId={`editor-toolbar-show-markup-reviewer-${index()}`}
              author={author}
              onClick={(): void => apply({ author })}
            />
          )}
        </For>
      </div>
    </Menu>
  );
}

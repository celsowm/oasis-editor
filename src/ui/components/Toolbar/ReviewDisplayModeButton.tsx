import { For, Show, createMemo } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { CheckIcon } from "@/ui/utils/customIcons.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import type { JSX } from "solid-js";
import type { ReviewDisplayMode } from "@/core/model.js";

export interface ReviewDisplayModeButtonProps {
  api: ToolbarActionApi;
}

const MODES = [
  { mode: "all", labelKey: "review.displayModeAll" },
  { mode: "final", labelKey: "review.displayModeFinal" },
  { mode: "original", labelKey: "review.displayModeOriginal" },
] as const;

function rawMode(api: ToolbarActionApi): ReviewDisplayMode {
  const value = api.commands.state("setReviewDisplayMode").value;
  return value === "final" || value === "original" ? value : "all";
}

/**
 * Display for Review gallery (Word-style): a single trigger showing the
 * current view, with All Markup / Final / Original items marked as radios.
 */
export function ReviewDisplayModeButton(
  props: ReviewDisplayModeButtonProps,
): JSX.Element {
  const t = useI18n();
  const api = props.api;
  const current = createMemo((): ReviewDisplayMode => rawMode(api));
  const apply = (mode: ReviewDisplayMode): void => {
    api.commands.execute("setReviewDisplayMode", mode);
    api.focusEditor();
  };

  return (
    <Menu
      icon="file-diff"
      testId="editor-toolbar-display-for-review"
      tooltip={t("review.displayForReview")}
      panelClass="oasis-editor-review-display-mode-menu"
    >
      <For each={MODES}>
        {(item): JSX.Element => {
          const isActive = (): boolean => current() === item.mode;
          return (
            <button
              type="button"
              class="oasis-editor-line-spacing-item"
              classList={{
                "oasis-editor-line-spacing-item-active": isActive(),
              }}
              role="menuitemradio"
              aria-checked={isActive()}
              data-testid={`editor-toolbar-display-for-review-${item.mode}`}
              onClick={(): void => apply(item.mode)}
            >
              <span
                class="oasis-editor-line-spacing-item-check"
                aria-hidden="true"
              >
                <Show when={isActive()}>
                  <CheckIcon size={14} />
                </Show>
              </span>
              <span class="oasis-editor-line-spacing-item-label">
                {t(item.labelKey)}
              </span>
            </button>
          );
        }}
      </For>
    </Menu>
  );
}

import { Show, type JSX } from "solid-js";
import type { UseEditorFindReplaceResult } from "@/app/controllers/useEditorFindReplace.js";
import { t } from "@/i18n/index.js";

export interface FindReplaceDialogProps {
  fr: UseEditorFindReplaceResult;
}

export function FindReplaceDialog(props: FindReplaceDialogProps) {
  const { fr } = props;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        fr.findPrevious();
      } else {
        fr.findNext();
      }
    } else if (e.key === "Escape") {
      fr.setIsOpen(false);
    }
  };

  return (
    <Show when={fr.isOpen()}>
      <div class="oasis-editor-find-replace-dialog" onKeyDown={handleKeyDown}>
        <div class="oasis-editor-fr-header">
          <span>{t("find.title")}</span>
          <button
            class="oasis-editor-fr-close"
            onClick={() => fr.setIsOpen(false)}
            aria-label={t("generic.close")}
          >
            <i data-lucide="x" />
          </button>
        </div>

        <div class="oasis-editor-fr-body">
          <div class="oasis-editor-fr-input-group">
            <div class="oasis-editor-fr-input-wrapper">
              <input
                type="text"
                placeholder={t("find.placeholder")}
                value={fr.searchTerm()}
                onInput={(e) => fr.setSearchTerm(e.currentTarget.value)}
                autofocus
                class="oasis-editor-fr-input"
              />
              <span class="oasis-editor-fr-counter">
                {fr.matches().length > 0
                  ? `${fr.currentIndex() + 1} / ${fr.matches().length}`
                  : t("find.noMatches")}
              </span>
            </div>

            <div class="oasis-editor-fr-actions">
              <button
                onClick={fr.findPrevious}
                disabled={fr.matches().length === 0}
                title={t("find.prevTooltip")}
              >
                <i data-lucide="chevron-up" />
              </button>
              <button
                onClick={fr.findNext}
                disabled={fr.matches().length === 0}
                title={t("find.nextTooltip")}
              >
                <i data-lucide="chevron-down" />
              </button>
            </div>
          </div>

          <div class="oasis-editor-fr-input-group">
            <input
              type="text"
              placeholder={t("replace.placeholder")}
              value={fr.replaceTerm()}
              onInput={(e) => fr.setReplaceTerm(e.currentTarget.value)}
              class="oasis-editor-fr-input"
            />
            <div class="oasis-editor-fr-actions">
              <button
                class="oasis-editor-fr-btn-text"
                onClick={fr.replace}
                disabled={fr.matches().length === 0}
              >
                {t("replace.one")}
              </button>
              <button
                class="oasis-editor-fr-btn-text"
                onClick={fr.replaceAll}
                disabled={fr.matches().length === 0}
              >
                {t("replace.allBtn")}
              </button>
            </div>
          </div>

          <div class="oasis-editor-fr-options">
            <label class="oasis-editor-fr-checkbox">
              <input
                type="checkbox"
                checked={fr.findOptions().matchCase}
                onChange={(e) =>
                  fr.setFindOptions({
                    ...fr.findOptions(),
                    matchCase: e.currentTarget.checked,
                  })
                }
              />
              <span>{t("find.matchCase")}</span>
            </label>
            <label class="oasis-editor-fr-checkbox">
              <input
                type="checkbox"
                checked={fr.findOptions().wholeWord}
                onChange={(e) =>
                  fr.setFindOptions({
                    ...fr.findOptions(),
                    wholeWord: e.currentTarget.checked,
                  })
                }
              />
              <span>{t("find.wholeWord")}</span>
            </label>
          </div>
        </div>
      </div>
    </Show>
  );
}

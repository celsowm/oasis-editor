import { Show } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { UseEditorFindReplaceResult } from "@/app/controllers/useEditorFindReplace.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { Stack } from "@/ui/public/Stack.js";
import { StatusText } from "@/ui/public/StatusText.js";
import { SurfaceButton } from "@/ui/public/SurfaceButton.js";
import { Text } from "@/ui/public/Text.js";
import { TextField } from "@/ui/public/TextField.js";
import { JSX } from "solid-js";

export interface FindReplaceDialogProps {
  fr: UseEditorFindReplaceResult;
}

export function FindReplaceDialog(props: FindReplaceDialogProps): JSX.Element {
  const t = useI18n();
  const { fr } = props;

  const handleKeyDown = (e: KeyboardEvent): void => {
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
          <Text>{t("find.title")}</Text>
          <SurfaceButton
            class="oasis-editor-fr-close"
            icon="x"
            onClick={(): void => fr.setIsOpen(false)}
            label={t("generic.close")}
          />
        </div>

        <div class="oasis-editor-fr-body">
          <div class="oasis-editor-fr-input-group">
            <div class="oasis-editor-fr-input-wrapper">
              <TextField
                type="text"
                placeholder={t("find.placeholder")}
                value={fr.searchTerm()}
                onChange={(value): void => fr.setSearchTerm(value)}
                autofocus
                controlClass="oasis-editor-fr-input"
              />
              <StatusText class="oasis-editor-fr-counter">
                {fr.matches().length > 0
                  ? `${fr.currentIndex() + 1} / ${fr.matches().length}`
                  : t("find.noMatches")}
              </StatusText>
            </div>

            <Stack class="oasis-editor-fr-actions" direction="row" spacing={1}>
              <SurfaceButton
                onClick={fr.findPrevious}
                disabled={fr.matches().length === 0}
                icon="chevron-up"
                label={t("find.prevTooltip")}
              />
              <SurfaceButton
                onClick={fr.findNext}
                disabled={fr.matches().length === 0}
                icon="chevron-down"
                label={t("find.nextTooltip")}
              />
            </Stack>
          </div>

          <div class="oasis-editor-fr-input-group">
            <TextField
              type="text"
              placeholder={t("replace.placeholder")}
              value={fr.replaceTerm()}
              onChange={(value): void => fr.setReplaceTerm(value)}
              controlClass="oasis-editor-fr-input"
            />
            <Stack class="oasis-editor-fr-actions" direction="row" spacing={1}>
              <SurfaceButton
                class="oasis-editor-fr-btn-text"
                onClick={fr.replace}
                disabled={fr.matches().length === 0}
              >
                {t("replace.one")}
              </SurfaceButton>
              <SurfaceButton
                class="oasis-editor-fr-btn-text"
                onClick={fr.replaceAll}
                disabled={fr.matches().length === 0}
              >
                {t("replace.allBtn")}
              </SurfaceButton>
            </Stack>
          </div>

          <Stack class="oasis-editor-fr-options" direction="row" spacing={1}>
            <Checkbox
              class="oasis-editor-fr-checkbox"
              label={t("find.matchCase")}
              checked={fr.findOptions().matchCase}
              onChange={(checked): void =>
                fr.setFindOptions({
                  ...fr.findOptions(),
                  matchCase: checked,
                })
              }
            />
            <Checkbox
              class="oasis-editor-fr-checkbox"
              label={t("find.wholeWord")}
              checked={fr.findOptions().wholeWord}
              onChange={(checked): void =>
                fr.setFindOptions({
                  ...fr.findOptions(),
                  wholeWord: checked,
                })
              }
            />
          </Stack>
        </div>
      </div>
    </Show>
  );
}

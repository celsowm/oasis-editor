import { Show, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { type TranslationKey } from "@/i18n/index.js";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, clampZoom } from "./app/editorZoom.js";

export interface EditorStatusBarProps {
  wordCount: () => number;
  characterCount: () => number;
  currentPage: () => number;
  totalPages: () => number;
  zoomPercent: () => number;
  adjustZoom: (delta: number) => void;
  setZoomPercent: (value: number) => void;
  persistenceStatus?: () => string;
}

export function EditorStatusBar(props: EditorStatusBarProps): JSX.Element {
  const t = useI18n();
  return (
    <div class="oasis-editor-statusbar" data-testid="editor-statusbar">
      <div class="oasis-editor-statusbar-group oasis-editor-statusbar-start">
        <span
          class="oasis-editor-statusbar-item"
          data-testid="editor-statusbar-word-count"
        >
          {t("status.words", [props.wordCount()])}
        </span>
        <span
          class="oasis-editor-statusbar-item"
          data-testid="editor-statusbar-character-count"
        >
          {t("status.characters", [props.characterCount()])}
        </span>
        <span class="oasis-editor-statusbar-item">
          {t("status.page", [props.currentPage(), props.totalPages()])}
        </span>
      </div>
      <div class="oasis-editor-statusbar-group oasis-editor-statusbar-end">
        <div
          class="oasis-editor-statusbar-zoom"
          data-testid="editor-statusbar-zoom-control"
          aria-label={t("status.zoom")}
        >
          <button
            type="button"
            class="oasis-editor-zoom-button"
            aria-label={`${t("status.zoom")} -`}
            disabled={props.zoomPercent() <= ZOOM_MIN}
            onClick={(): void => props.adjustZoom(-ZOOM_STEP)}
          >
            −
          </button>
          <input
            class="oasis-editor-zoom-slider"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={props.zoomPercent()}
            aria-label={t("status.zoom")}
            aria-valuetext={`${props.zoomPercent()}%`}
            onInput={(event): void =>
              props.setZoomPercent(clampZoom(event.currentTarget.valueAsNumber))
            }
          />
          <button
            type="button"
            class="oasis-editor-zoom-button"
            aria-label={`${t("status.zoom")} +`}
            disabled={props.zoomPercent() >= ZOOM_MAX}
            onClick={(): void => props.adjustZoom(ZOOM_STEP)}
          >
            +
          </button>
          <span
            class="oasis-editor-statusbar-item oasis-editor-zoom-value"
            data-testid="editor-statusbar-zoom"
          >
            {props.zoomPercent()}%
          </span>
        </div>
        <Show when={props.persistenceStatus}>
          {((): JSX.Element => {
            const rawStatus = props.persistenceStatus!();
            const status = rawStatus.toLowerCase();
            const key = status.includes("saved")
              ? "status.saved"
              : status.includes("saving")
                ? "status.saving"
                : status.includes("error")
                  ? "status.error"
                  : null;
            return (
              <Show when={key}>
                <span
                  class={`oasis-editor-statusbar-item oasis-editor-persistence-status oasis-editor-status-${status
                    .replace("...", "ing")
                    .replace(".", "")}`}
                >
                  {t(key as TranslationKey)}
                </span>
              </Show>
            );
          })()}
        </Show>
      </div>
    </div>
  );
}

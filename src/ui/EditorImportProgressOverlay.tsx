import { Show, type Accessor, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { type TranslationKey } from "@/i18n/index.js";
import type { ImportProgressState } from "@/app/controllers/useEditorDocumentIO.js";
import { OasisBrandMark } from "./components/OasisBrandMark.js";

export interface EditorImportProgressOverlayProps {
  progress?: Accessor<ImportProgressState | null>;
}

export function EditorImportProgressOverlay(
  props: EditorImportProgressOverlayProps,
): JSX.Element {
  const t = useI18n();
  return (
    <Show when={props.progress?.()}>
      {(progress): JSX.Element => {
        const isDone = progress().phase === "done";
        const isError = progress().phase === "error";
        return (
          <div
            class="oasis-editor-import-overlay"
            classList={{
              "oasis-editor-import-overlay-done": isDone,
              "oasis-editor-import-overlay-error": isError,
            }}
            data-testid="editor-import-overlay"
            role="status"
            aria-live="polite"
            aria-busy={!isDone && !isError}
          >
            <div class="oasis-editor-import-card">
              <OasisBrandMark height={40} class="oasis-editor-loading-mark" />
              <div class="oasis-editor-import-title">
                {t("import.overlay.title")}
              </div>
              <div
                class="oasis-editor-import-phase"
                data-testid="editor-import-phase"
              >
                {t(`import.phase.${progress().phase}` as TranslationKey)}
              </div>
              <div class="oasis-editor-import-progress-track">
                <div
                  class="oasis-editor-import-progress-bar"
                  classList={{
                    "oasis-editor-import-progress-bar-done": isDone,
                    "oasis-editor-import-progress-bar-error": isError,
                    "oasis-editor-import-progress-bar-indeterminate":
                      progress().phase === "applying-editor-state" ||
                      progress().phase === "stabilizing-layout",
                  }}
                  data-testid="editor-import-progress-bar"
                  style={{ width: `${progress().progress}%` }}
                />
              </div>
              <div class="oasis-editor-import-progress-label">
                {isDone ? (
                  <span class="oasis-editor-import-done-icon">
                    {t("import.phase.done")}
                  </span>
                ) : isError ? (
                  <span class="oasis-editor-import-error-icon">
                    {t("import.phase.error")}
                  </span>
                ) : (
                  <>{Math.round(progress().progress)}%</>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </Show>
  );
}

import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { t } from "../i18n/index.js";
import { OasisBrandMark } from "./components/OasisBrandMark.js";

export interface OasisEditorLoadingProps {
  label?: string;
  class?: string;
  style?: JSX.CSSProperties | string;
  /**
   * `overlay` (default): absolutely fills the already-mounted editor shell.
   * `fill`: occupies its container in normal flow — used as the download-phase
   * fallback when no positioned editor shell exists yet.
   */
  variant?: "overlay" | "fill";
  /**
   * 0–1 for a real/simulated percentage bar; undefined/null for indeterminate.
   */
  progress?: number | null;
}

/**
 * Oasis-owned loading state. Lightweight (solid-js plus the inline ~6 KB WebP
 * brand mark) so it lives in the main chunk and paints from the first JS tick
 * without pulling the editor/font graph. Reuses the docx-import card styles for
 * visual consistency. When `progress` is provided, renders a deterministic fill
 * bar; otherwise animates indeterminate.
 */
export function OasisEditorLoading(props: OasisEditorLoadingProps) {
  const variant = () => props.variant ?? "overlay";
  const pct = () => {
    const p = props.progress;
    return p != null ? Math.min(100, Math.round(p * 100)) : null;
  };
  const isDone = () => (pct() ?? 0) >= 100;

  return (
    <div
      class={[
        "oasis-editor-loading",
        `oasis-editor-loading--${variant()}`,
        props.class,
      ]
        .filter(Boolean)
        .join(" ")}
      style={props.style}
      role="status"
      aria-live="polite"
      aria-busy={!isDone()}
    >
      <div class="oasis-editor-import-card">
        <OasisBrandMark height={40} class="oasis-editor-loading-mark" />
        <div class="oasis-editor-import-title">
          {props.label ?? t("loading.title")}
        </div>
        <div class="oasis-editor-import-progress-track">
          <div
            class={[
              "oasis-editor-import-progress-bar",
              pct() == null
                ? "oasis-editor-import-progress-bar-indeterminate"
                : isDone()
                  ? "oasis-editor-import-progress-bar-done"
                  : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              pct() != null && !isDone() ? { width: `${pct()}%` } : undefined
            }
          />
        </div>
        <Show when={pct() != null}>
          <div class="oasis-editor-import-progress-label">
            {isDone() ? (
              <span class="oasis-editor-import-done-icon">Done</span>
            ) : (
              `${pct()}%`
            )}
          </div>
        </Show>
      </div>
    </div>
  );
}

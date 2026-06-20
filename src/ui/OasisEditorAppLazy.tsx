import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { OasisEditorLoading } from "./OasisEditorLoading.js";
import type { OasisEditorAppProps } from "./OasisEditorAppProps.js";
import type { Component } from "solid-js";
import { createTranslator } from "@/i18n/index.js";
import { I18nProvider } from "@/i18n/I18nContext.js";

/**
 * Code-splitting boundary for the editor. Loads `OasisEditorApp` (and the
 * ~10MB of bundled fonts it drags in) via a single dynamic `import()`, keeping
 * that weight in a lazy chunk. While the chunk downloads, renders an
 * `OasisEditorLoading` card with a simulated-progress bar: the bar animates
 * exponentially toward 90% (fast at first, then slowing), then snaps to 100%
 * when the import resolves. Real byte-level progress isn't available for
 * dynamic ES module imports without knowing the hashed chunk URL ahead of time,
 * so this approach gives the best honest UX — it looks and feels like progress
 * without lying about bytes received.
 *
 * Must not statically import anything that pulls the editor/font graph.
 */
export function OasisEditorAppLazy(props: OasisEditorAppProps = {}) {
  // Localize the download-phase loading card via a provider bound to this
  // instance's locale. OasisEditorApp nests its own provider once mounted. The
  // i18n module only imports the two locale string maps — no editor/font graph —
  // so it is safe in this lightweight chunk.
  const translator = createTranslator(() => props.ui?.locale ?? "pt-BR");

  const [progress, setProgress] = createSignal(0);
  const [App, setApp] = createSignal<Component<OasisEditorAppProps> | null>(
    null,
  );

  const loadingOptions = () => {
    const value = props.ui?.loading;
    return typeof value === "object" && value !== null ? value : undefined;
  };

  onMount(() => {
    const start = performance.now();
    // τ = 5 s: reaches ~18% at 1s, ~33% at 2s, ~63% at 5s, ~86% at 10s.
    // Capped at 90% so there is always room to snap to 100% on completion.
    const tau = 5000;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      setProgress((1 - Math.exp(-elapsed / tau)) * 0.9);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    onCleanup(() => {
      cancelled = true;
    });

    import("./OasisEditorApp.js")
      .then((m) => {
        cancelled = true;
        setProgress(1);
        // Brief pause at 100% so the user sees the bar complete before the
        // editor replaces the loading card.
        setTimeout(() => setApp(() => m.OasisEditorApp), 180);
      })
      .catch(() => {
        cancelled = true;
      });
  });

  return (
    <I18nProvider translator={translator}>
      <Show
        when={App()}
        fallback={
          <OasisEditorLoading
            variant="fill"
            progress={progress()}
            label={loadingOptions()?.label}
            class={loadingOptions()?.class}
            style={loadingOptions()?.style}
          />
        }
      >
        {(getApp) => {
          const C = getApp();
          return <C {...props} />;
        }}
      </Show>
    </I18nProvider>
  );
}

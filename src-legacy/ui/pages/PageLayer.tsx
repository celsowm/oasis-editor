import { Component, For, Show, createEffect } from "solid-js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { FragmentRenderer } from "./FragmentRenderer.tsx";
import { useI18n } from "../I18nContext.tsx";
import { Logger } from "../../core/utils/Logger.js";

export interface PageLayerProps {
  layout: LayoutState | null;
  editingMode: "main" | "header" | "footer" | "footnote";
}

export const PageLayerComponent: Component<PageLayerProps> = (props) => {
  const { t } = useI18n();
  Logger.debug("PAGE_LAYER: render", {
    editingMode: props.editingMode,
    pageCount: props.layout?.pages.length ?? 0,
  });

  createEffect(() => {
    const firstPage = props.layout?.pages[0];
    const firstFragment = firstPage?.fragments[0];
    Logger.debug("PAGE_LAYER: reactive snapshot", {
      editingMode: props.editingMode,
      pageCount: props.layout?.pages.length ?? 0,
      firstPageId: firstPage?.id ?? null,
      firstBlockId: firstFragment?.blockId ?? null,
      firstFragmentText: firstFragment?.text ?? null,
    });
    requestAnimationFrame(() => {
      const fragmentEl = document.querySelector<HTMLElement>(
        ".oasis-page .oasis-fragment",
      );
      const pageEl = document.querySelector<HTMLElement>(".oasis-page");
      const styles = fragmentEl ? window.getComputedStyle(fragmentEl) : null;
      Logger.debug(
        `PAGE_LAYER: dom snapshot text="${fragmentEl?.textContent ?? ""}" id=${fragmentEl?.getAttribute("data-fragment-id") ?? "null"} class="${fragmentEl?.className ?? ""}" opacity=${styles?.opacity ?? "null"} display=${styles?.display ?? "null"} visibility=${styles?.visibility ?? "null"} color=${styles?.color ?? "null"} pageDisplay=${pageEl ? window.getComputedStyle(pageEl).display : "null"}`,
      );
    });
  });

  return (
    <For each={props.layout?.pages}>
      {(page) => {
        const editingClass = () => 
          props.editingMode === "header" ? "editing-header"
          : props.editingMode === "footer" ? "editing-footer"
          : props.editingMode === "footnote" ? "editing-footnote"
          : "";

        return (
          <section
            class={`oasis-page ${editingClass()}`.trim()}
            data-page-id={page.id}
            style={{
              width: `${page.rect.width}px`,
              "min-height": `${page.rect.height}px`,
            }}
          >
            {/* Header UI */}
            <Show when={page.headerRect}>
              <div
                class={`oasis-page-header-ui ${props.editingMode === "header" ? "active" : ""}`}
                style={{
                  position: "absolute",
                  left: `${page.headerRect!.x}px`,
                  top: `${page.headerRect!.y}px`,
                  width: `${page.headerRect!.width}px`,
                  height: `${page.headerRect!.height}px`,
                  "pointer-events": "none",
                  "z-index": "5",
                }}
              >
                <div class="oasis-header-line"></div>
                <div class="oasis-header-label">{t("editor", "header")}</div>
              </div>
              <For each={page.headerFragments}>
                {(frag) => <FragmentRenderer fragment={frag} isDimmed={props.editingMode !== "header"} />}
              </For>
            </Show>

            {/* Main Content */}
            <For each={page.fragments}>
              {(frag) => <FragmentRenderer fragment={frag} isDimmed={props.editingMode !== "main"} />}
            </For>

            {/* Footer UI */}
            <Show when={page.footerRect}>
              <div
                class={`oasis-page-footer-ui ${props.editingMode === "footer" ? "active" : ""}`}
                style={{
                  position: "absolute",
                  left: `${page.footerRect!.x}px`,
                  top: `${page.footerRect!.y}px`,
                  width: `${page.footerRect!.width}px`,
                  height: `${page.footerRect!.height}px`,
                  "pointer-events": "none",
                  "z-index": "5",
                }}
              >
                <div class="oasis-footer-line"></div>
                <div class="oasis-footer-label">{t("editor", "footer")}</div>
              </div>
              <For each={page.footerFragments}>
                {(frag) => <FragmentRenderer fragment={frag} isDimmed={props.editingMode !== "footer"} />}
              </For>
            </Show>

            {/* Footnote Area */}
            <Show when={page.footnoteFragments.length > 0 && page.footnoteAreaRect}>
              <div
                class="oasis-footnote-separator"
                style={{
                  position: "absolute",
                  left: `${page.footnoteAreaRect!.x}px`,
                  top: `${page.footnoteAreaRect!.y + 4}px`,
                  width: "120px",
                  height: "1px",
                  "border-top": "0.5pt solid #94a3b8",
                  "pointer-events": "none",
                }}
              ></div>
              <For each={page.footnoteFragments}>
                {(frag) => (
                   <FragmentRenderer fragment={frag} isDimmed={props.editingMode !== "footnote"} />
                )}
              </For>
            </Show>
          </section>
        );
      }}
    </For>
  );
};

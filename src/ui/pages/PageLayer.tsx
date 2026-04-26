import { Component, For, Show } from "solid-js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { FragmentRenderer } from "./FragmentRenderer.tsx";

export interface PageLayerProps {
  layout: LayoutState | null;
  editingMode: "main" | "header" | "footer" | "footnote";
}

export const PageLayerComponent: Component<PageLayerProps> = (props) => {
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
            dataset={{ pageId: page.id }}
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
                <div class="oasis-header-label">Cabeçalho</div>
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
                <div class="oasis-footer-label">Rodapé</div>
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

// Legacy wrapper
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

export class PageLayer {
  private dispose: () => void;
  private setLayout: (l: LayoutState | null) => void;
  private setMode: (m: "main" | "header" | "footer" | "footnote") => void;

  constructor(container: HTMLElement) {
    const [layout, setLayout] = createSignal<LayoutState | null>(null);
    const [mode, setMode] = createSignal<"main" | "header" | "footer" | "footnote">("main");
    this.setLayout = setLayout;
    this.setMode = setMode;

    this.dispose = render(() => (
      <PageLayerComponent layout={layout()} editingMode={mode()} />
    ), container);
  }

  render(layout: LayoutState, editingMode: "main" | "header" | "footer" | "footnote" = "main"): void {
    this.setLayout(layout);
    this.setMode(editingMode);
  }

  destroy(): void {
    this.dispose();
  }
}

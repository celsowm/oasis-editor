import { Show } from "solid-js";
import { Toolbar } from "../components/Toolbar/Toolbar.js";
import { OasisEditorEditor } from "../OasisEditorEditor.js";
import type { ShellProps } from "./DocumentShell.js";
import { PluginUiHost } from "../components/PluginUi/PluginUiHost.js";

export function InlineShell(props: ShellProps) {
  return (
    <div
      class="oasis-inline-shell"
      style={{
        border: "1px solid var(--oasis-toolbar-border)",
        "border-radius": "var(--oasis-radius)",
        overflow: "hidden",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <Show when={props.showChrome && props.showToolbar}>
        <Toolbar
          host={props.toolbarHost}
          registry={props.toolbarRegistry}
          view={props.toolbarView}
          layout={props.toolbarLayout}
        />
      </Show>
      <PluginUiHost editor={props.runtimeEditor}>
        <div class="oasis-editor-main-container">
          <section class="oasis-editor-stage" style={{ padding: "0" }}>
            <OasisEditorEditor
              state={() => props.state}
              layout={{
                ...props.layout,
                measuredBlockHeights: () => props.measuredBlockHeights(),
                measuredParagraphLayouts: () =>
                  props.measuredParagraphLayouts(),
                viewportHeight: props.viewportHeight(),
                readOnly: props.isReadOnly,
              }}
              overlays={{
                ...props.overlays,
                toolbarHost: props.toolbarHost,
                persistenceStatus: () => props.persistenceStatus(),
                showFloatingTableToolbar: () =>
                  props.showFloatingTableToolbar(),
              }}
              refs={props.refs}
              surfaceHandlers={props.surfaceHandlers}
              inputHandlers={props.inputHandlers}
              fileHandlers={props.fileHandlers}
            />
          </section>
        </div>
      </PluginUiHost>
    </div>
  );
}

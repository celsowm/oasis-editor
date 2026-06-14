import { Show } from "solid-js";
import { OasisEditorEditor } from "../OasisEditorEditor.js";
import type { ShellProps } from "./DocumentShell.js";
import { PluginUiHost } from "../components/PluginUi/PluginUiHost.js";

export function BalloonShell(props: ShellProps) {
  return (
    <div class="oasis-balloon-shell">
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

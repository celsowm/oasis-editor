
import { OasisEditorEditor } from "../OasisEditorEditor.js";
import type { ShellProps } from "./DocumentShell.js";

export function BalloonShell(props: ShellProps) {
  return (
    <div class="oasis-balloon-shell">
      <div class="oasis-editor-main-container">
        <section class="oasis-editor-stage" style={{ padding: "0" }}>
          <OasisEditorEditor
            state={() => props.state}
            layout={{
              ...props.layout,
              measuredBlockHeights: () => props.measuredBlockHeights(),
              measuredParagraphLayouts: () => props.measuredParagraphLayouts(),
              viewportHeight: props.viewportHeight(),
              readOnly: props.isReadOnly,
            }}
            overlays={{
              ...props.overlays,
              toolbarHost: props.toolbarHost,
              persistenceStatus: () => props.persistenceStatus(),
              showFloatingTableToolbar: () => props.showFloatingTableToolbar(),
            }}
            refs={props.refs}
            surfaceHandlers={props.surfaceHandlers}
            inputHandlers={props.inputHandlers}
            fileHandlers={props.fileHandlers}
          />
        </section>
      </div>
    </div>
  );
}

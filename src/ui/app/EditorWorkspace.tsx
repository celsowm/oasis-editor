import { Show, type Accessor } from "solid-js";
import {
  OasisEditorEditor,
  type OasisEditorEditorFileHandlers,
  type OasisEditorEditorInputHandlers,
  type OasisEditorEditorLayoutProps,
  type OasisEditorEditorOverlayProps,
  type OasisEditorEditorRefProps,
  type OasisEditorEditorSurfaceHandlers,
} from "@/ui/OasisEditorEditor.js";
import type { ShellProps } from "@/ui/shells/DocumentShell.js";
import type { ToolbarHost } from "@/ui/components/Toolbar/state/createToolbarApi.js";
import type { ToolbarRegistry } from "@/ui/components/Toolbar/registry/ToolbarRegistry.js";
import type { MenuRegistry } from "@/ui/components/Menubar/menuRegistry.js";
import type { EditorLayoutParagraph, EditorState } from "@/core/model.js";
import type {
  ToolbarLayoutMode,
  ToolbarViewMode,
} from "@/ui/OasisEditorAppProps.js";
import type { OasisEditor } from "@/core/plugin.js";
import { PluginUiHost } from "@/ui/components/PluginUi/PluginUiHost.js";

export interface EditorWorkspaceProps {
  useComposedShell: () => boolean;
  shellComponent: () => (
    props: ShellProps,
  ) => ReturnType<typeof OasisEditorEditor>;
  state: Accessor<EditorState>;
  toolbarHost: () => ToolbarHost;
  runtimeEditor: Accessor<OasisEditor>;
  persistenceStatus: () => string;
  toolbarRegistry: ToolbarRegistry;
  menuRegistry: MenuRegistry;
  showChrome: () => boolean;
  showTitleBar: () => boolean;
  showMenubar: () => boolean;
  showToolbar: () => boolean;
  showOutline: () => boolean;
  toolbarView: () => ToolbarViewMode;
  toolbarLayout: () => ToolbarLayoutMode;
  isReadOnly: () => boolean;
  viewportHeight: () => number | string | undefined;
  measuredBlockHeights: Accessor<Record<string, number>>;
  measuredParagraphLayouts: Accessor<Record<string, EditorLayoutParagraph>>;
  showFloatingTableToolbar: Accessor<boolean>;
  layout: OasisEditorEditorLayoutProps;
  overlays: OasisEditorEditorOverlayProps;
  refs: OasisEditorEditorRefProps;
  surfaceHandlers: OasisEditorEditorSurfaceHandlers;
  inputHandlers: OasisEditorEditorInputHandlers;
  fileHandlers: OasisEditorEditorFileHandlers;
}

/**
 * Renders the editor body, choosing between the composed shell (docs/inline/
 * balloon chrome) and the bare canvas editor. Pure binding: it forwards the
 * already-assembled view-prop bundles and runtime facade to the right surface.
 */
export function EditorWorkspace(props: EditorWorkspaceProps) {
  const renderComposedShell = () => {
    const Shell = props.shellComponent();
    return (
      <Shell
        state={props.state()}
        toolbarHost={props.toolbarHost}
        runtimeEditor={props.runtimeEditor}
        persistenceStatus={props.persistenceStatus}
        toolbarRegistry={props.toolbarRegistry}
        menuRegistry={props.menuRegistry}
        showChrome={props.showChrome()}
        showTitleBar={props.showTitleBar()}
        showMenubar={props.showMenubar()}
        showToolbar={props.showToolbar()}
        showOutline={props.showOutline()}
        toolbarView={props.toolbarView()}
        toolbarLayout={props.toolbarLayout()}
        isReadOnly={props.isReadOnly()}
        measuredBlockHeights={props.measuredBlockHeights}
        measuredParagraphLayouts={props.measuredParagraphLayouts}
        viewportHeight={props.viewportHeight}
        showFloatingTableToolbar={props.showFloatingTableToolbar}
        layout={props.layout}
        overlays={props.overlays}
        refs={props.refs}
        surfaceHandlers={props.surfaceHandlers}
        inputHandlers={props.inputHandlers}
        fileHandlers={props.fileHandlers}
      />
    );
  };

  return (
    <>
      <Show when={props.useComposedShell()}>{renderComposedShell()}</Show>

      <Show when={!props.useComposedShell()}>
        <PluginUiHost editor={props.runtimeEditor}>
          <div class="oasis-editor-main-container">
            <section class="oasis-editor-stage">
              <OasisEditorEditor
                state={props.state}
                layout={{
                  ...props.layout,
                  measuredBlockHeights: props.measuredBlockHeights,
                  measuredParagraphLayouts: props.measuredParagraphLayouts,
                  readOnly: props.isReadOnly(),
                }}
                overlays={{
                  ...props.overlays,
                  toolbarHost: props.toolbarHost,
                  persistenceStatus: props.persistenceStatus,
                  showFloatingTableToolbar: props.showFloatingTableToolbar,
                }}
                refs={props.refs}
                surfaceHandlers={props.surfaceHandlers}
                inputHandlers={props.inputHandlers}
                fileHandlers={props.fileHandlers}
              />
            </section>
          </div>
        </PluginUiHost>
      </Show>
    </>
  );
}

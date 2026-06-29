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
import type {
  EditorLayoutDocument,
  EditorLayoutParagraph,
  EditorState,
} from "@/core/model.js";
import type {
  ToolbarLayoutMode,
  ToolbarViewMode,
} from "@/ui/OasisEditorAppProps.js";
import type { OasisEditor } from "@/core/plugin.js";
import { PluginUiHost } from "@/ui/components/PluginUi/PluginUiHost.js";
import { JSX } from "solid-js";

/** Runtime facade the workspace forwards to the editor surface and shell. */
export interface EditorWorkspaceRuntime {
  state: Accessor<EditorState>;
  toolbarHost: () => ToolbarHost;
  runtimeEditor: Accessor<OasisEditor>;
  persistenceStatus: () => string;
  toolbarRegistry: ToolbarRegistry;
  menuRegistry: MenuRegistry;
  showFloatingTableToolbar: Accessor<boolean>;
}

/** Chrome visibility / toolbar-mode flags. */
export interface EditorWorkspaceChrome {
  showChrome: () => boolean;
  showTitleBar: () => boolean;
  showMenubar: () => boolean;
  showToolbar: () => boolean;
  showOutline: () => boolean;
  toolbarView: () => ToolbarViewMode;
  toolbarLayout: () => ToolbarLayoutMode;
}

/** The document-view props: read-only/sizing plus the assembled prop bundles. */
export interface EditorWorkspaceView {
  isReadOnly: () => boolean;
  viewportHeight: () => number | string | undefined;
  measuredBlockHeights: Accessor<Record<string, number>>;
  measuredParagraphLayouts: Accessor<Record<string, EditorLayoutParagraph>>;
  documentLayout: Accessor<EditorLayoutDocument>;
  layout: OasisEditorEditorLayoutProps;
  overlays: OasisEditorEditorOverlayProps;
  refs: OasisEditorEditorRefProps;
  surfaceHandlers: OasisEditorEditorSurfaceHandlers;
  inputHandlers: OasisEditorEditorInputHandlers;
  fileHandlers: OasisEditorEditorFileHandlers;
}

export interface EditorWorkspaceProps {
  useComposedShell: () => boolean;
  shellComponent: () => (
    props: ShellProps,
  ) => ReturnType<typeof OasisEditorEditor>;
  runtime: EditorWorkspaceRuntime;
  chrome: EditorWorkspaceChrome;
  view: EditorWorkspaceView;
}

/**
 * Renders the editor body, choosing between the composed shell (docs/inline/
 * balloon chrome) and the bare canvas editor. Pure binding: it forwards the
 * already-assembled view-prop bundles and runtime facade to the right surface.
 */
export function EditorWorkspace(props: EditorWorkspaceProps): JSX.Element {
  const renderComposedShell = (): JSX.Element => {
    const Shell = props.shellComponent();
    const { runtime, chrome, view } = props;
    return (
      <Shell
        state={runtime.state()}
        toolbarHost={runtime.toolbarHost}
        runtimeEditor={runtime.runtimeEditor}
        persistenceStatus={runtime.persistenceStatus}
        toolbarRegistry={runtime.toolbarRegistry}
        menuRegistry={runtime.menuRegistry}
        showChrome={chrome.showChrome()}
        showTitleBar={chrome.showTitleBar()}
        showMenubar={chrome.showMenubar()}
        showToolbar={chrome.showToolbar()}
        showOutline={chrome.showOutline()}
        toolbarView={chrome.toolbarView()}
        toolbarLayout={chrome.toolbarLayout()}
        isReadOnly={view.isReadOnly()}
        measuredBlockHeights={view.measuredBlockHeights}
        measuredParagraphLayouts={view.measuredParagraphLayouts}
        documentLayout={view.documentLayout}
        viewportHeight={view.viewportHeight}
        showFloatingTableToolbar={runtime.showFloatingTableToolbar}
        layout={view.layout}
        overlays={view.overlays}
        refs={view.refs}
        surfaceHandlers={view.surfaceHandlers}
        inputHandlers={view.inputHandlers}
        fileHandlers={view.fileHandlers}
      />
    );
  };

  return (
    <>
      <Show when={props.useComposedShell()}>{renderComposedShell()}</Show>

      <Show when={!props.useComposedShell()}>
        <PluginUiHost editor={props.runtime.runtimeEditor}>
          <div class="oasis-editor-main-container">
            <section class="oasis-editor-stage">
              <OasisEditorEditor
                state={props.runtime.state}
                layout={{
                  ...props.view.layout,
                  documentLayout: props.view.documentLayout,
                  measuredBlockHeights: props.view.measuredBlockHeights,
                  measuredParagraphLayouts: props.view.measuredParagraphLayouts,
                  readOnly: props.view.isReadOnly(),
                }}
                overlays={{
                  ...props.view.overlays,
                  toolbarHost: props.runtime.toolbarHost,
                  persistenceStatus: props.runtime.persistenceStatus,
                  showFloatingTableToolbar:
                    props.runtime.showFloatingTableToolbar,
                }}
                refs={props.view.refs}
                surfaceHandlers={props.view.surfaceHandlers}
                inputHandlers={props.view.inputHandlers}
                fileHandlers={props.view.fileHandlers}
              />
            </section>
          </div>
        </PluginUiHost>
      </Show>
    </>
  );
}

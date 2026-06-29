import { Show, type Accessor } from "solid-js";
import { Menubar } from "@/ui/components/Menubar/Menubar.js";
import { TitleBar } from "@/ui/components/TitleBar/TitleBar.js";
import { OutlinePanel } from "@/ui/components/Outline/OutlinePanel.js";
import { Toolbar } from "@/ui/components/Toolbar/Toolbar.js";
import {
  OasisEditorEditor,
  type OasisEditorEditorFileHandlers,
  type OasisEditorEditorInputHandlers,
  type OasisEditorEditorLayoutProps,
  type OasisEditorEditorOverlayProps,
  type OasisEditorEditorRefProps,
  type OasisEditorEditorSurfaceHandlers,
} from "@/ui/OasisEditorEditor.js";
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
import { createCanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";
import { getParagraphEntries } from "@/ui/canvas/CanvasGeometry.js";
import type { OasisEditor } from "@/core/plugin.js";
import { PluginUiHost } from "@/ui/components/PluginUi/PluginUiHost.js";
import { JSX } from "solid-js";

export interface ShellProps {
  state: EditorState;
  toolbarHost: () => ToolbarHost;
  runtimeEditor: Accessor<OasisEditor>;
  persistenceStatus: () => string;
  toolbarRegistry: ToolbarRegistry;
  menuRegistry: MenuRegistry;
  showChrome: boolean;
  showTitleBar: boolean;
  showMenubar: boolean;
  showToolbar: boolean;
  showOutline: boolean;
  toolbarView: ToolbarViewMode;
  toolbarLayout: ToolbarLayoutMode;
  isReadOnly: boolean;
  measuredBlockHeights: Accessor<Record<string, number>>;
  measuredParagraphLayouts: Accessor<Record<string, EditorLayoutParagraph>>;
  documentLayout: Accessor<EditorLayoutDocument>;
  viewportHeight: Accessor<number | string | undefined>;
  showFloatingTableToolbar: Accessor<boolean>;
  layout: Omit<
    OasisEditorEditorLayoutProps,
    | "documentLayout"
    | "measuredBlockHeights"
    | "measuredParagraphLayouts"
    | "viewportHeight"
    | "readOnly"
  >;
  overlays: Omit<
    OasisEditorEditorOverlayProps,
    "toolbarHost" | "persistenceStatus" | "showFloatingTableToolbar"
  >;
  refs: OasisEditorEditorRefProps;
  surfaceHandlers: OasisEditorEditorSurfaceHandlers;
  inputHandlers: OasisEditorEditorInputHandlers;
  fileHandlers: OasisEditorEditorFileHandlers;
}

export function DocumentShell(props: ShellProps): JSX.Element {
  let surfaceEl: HTMLDivElement | undefined;
  let viewportEl: HTMLDivElement | undefined;
  const outlineSnapshotProvider = createCanvasLayoutSnapshotProvider();
  const captureSurfaceRef = (el: HTMLDivElement): void => {
    surfaceEl = el;
    props.refs.onSurfaceRef?.(el);
  };
  const captureViewportRef = (el: HTMLDivElement): void => {
    viewportEl = el;
    props.refs.onViewportRef?.(el);
  };
  const handleOutlineNavigate = (id: string): void => {
    if (!surfaceEl) return;
    const snapshot = outlineSnapshotProvider.getCanvasLayoutSnapshot({
      surface: surfaceEl,
      state: props.state,
      documentLayout: props.documentLayout(),
      zoomFactor: props.layout.zoomFactor?.(),
    });
    if (!snapshot) return;
    const entries = getParagraphEntries(snapshot, id);
    const entry = entries[0];
    if (!entry) return;
    const viewport = viewportEl;
    const targetTop = entry.top;
    if (viewport) {
      const viewportRect = viewport.getBoundingClientRect();
      viewport.scrollTo({
        top: viewport.scrollTop + (targetTop - viewportRect.top) - 24,
        behavior: "smooth",
      });
      return;
    }
    window.scrollTo({
      top: window.scrollY + targetTop - 24,
      behavior: "smooth",
    });
  };
  return (
    <>
      <Show when={props.showChrome}>
        <Show when={props.toolbarView === "compact"}>
          <Show
            when={props.showTitleBar}
            fallback={
              <Show when={props.showMenubar}>
                <Menubar
                  host={props.toolbarHost}
                  registry={props.menuRegistry}
                />
              </Show>
            }
          >
            <TitleBar>
              <Show when={props.showMenubar}>
                <Menubar
                  host={props.toolbarHost}
                  registry={props.menuRegistry}
                />
              </Show>
            </TitleBar>
          </Show>
        </Show>
        <Show when={props.showToolbar}>
          <Toolbar
            host={props.toolbarHost}
            registry={props.toolbarRegistry}
            showFileGroup={
              props.toolbarView === "ribbon" ? true : !props.showMenubar
            }
            view={props.toolbarView}
            layout={props.toolbarLayout}
          />
        </Show>
      </Show>

      <PluginUiHost editor={props.runtimeEditor}>
        <div class="oasis-editor-main-container">
          <Show when={props.showChrome && props.showOutline}>
            <OutlinePanel
              state={props.state}
              onNavigate={handleOutlineNavigate}
              surfaceRef={(): HTMLDivElement | undefined => surfaceEl}
              viewportRef={(): HTMLDivElement | undefined => viewportEl}
              documentLayout={props.documentLayout}
              zoomFactor={props.layout.zoomFactor}
              snapshotProvider={outlineSnapshotProvider}
            />
          </Show>
          <section class="oasis-editor-stage">
            <OasisEditorEditor
              state={(): EditorState => props.state}
              layout={{
                ...props.layout,
                documentLayout: props.documentLayout,
                showHorizontalRuler: props.showChrome,
                measuredBlockHeights: (): Record<string, number> => props.measuredBlockHeights(),
                measuredParagraphLayouts: (): Record<string, EditorLayoutParagraph> =>
                  props.measuredParagraphLayouts(),
                viewportHeight: props.viewportHeight(),
                readOnly: props.isReadOnly,
              }}
              overlays={{
                ...props.overlays,
                toolbarHost: props.toolbarHost,
                persistenceStatus: (): string => props.persistenceStatus(),
                showFloatingTableToolbar: (): boolean =>
                  props.showFloatingTableToolbar(),
              }}
              refs={{
                ...props.refs,
                onViewportRef: captureViewportRef,
                onSurfaceRef: captureSurfaceRef,
              }}
              surfaceHandlers={props.surfaceHandlers}
              inputHandlers={props.inputHandlers}
              fileHandlers={props.fileHandlers}
            />
          </section>
        </div>
      </PluginUiHost>
    </>
  );
}

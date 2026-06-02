import { Show, type Accessor } from "solid-js";
import { Menubar } from "../components/Menubar/Menubar.js";
import { TitleBar } from "../components/TitleBar/TitleBar.js";
import { OutlinePanel } from "../components/Outline/OutlinePanel.js";
import { Toolbar } from "../components/Toolbar/Toolbar.js";
import { OasisEditorEditor, type OasisEditorEditorProps } from "../OasisEditorEditor.js";
import type { ToolbarHost } from "../components/Toolbar/state/createToolbarApi.js";
import type { ToolbarRegistry } from "../components/Toolbar/registry/ToolbarRegistry.js";
import type { EditorLayoutParagraph, EditorState } from "../../core/model.js";
import { buildCanvasLayoutSnapshot } from "../canvas/CanvasLayoutSnapshot.js";
import { getParagraphEntries } from "../canvas/CanvasGeometry.js";

/**
 * Props the shell forwards verbatim to {@link OasisEditorEditor}. Reusing the
 * editor's own prop types keeps a single source of truth for these signatures.
 */
type ForwardedEditorProps = Pick<
  OasisEditorEditorProps,
  | "selectionBoxes"
  | "selectedImageBox"
  | "caretBox"
  | "inputBox"
  | "hoveredRevision"
  | "focused"
  | "showCaret"
  | "importProgress"
  | "layoutMode"
  | "class"
  | "style"
  | "onViewportRef"
  | "onSurfaceRef"
  | "onTextareaRef"
  | "onImportInputRef"
  | "onImageInputRef"
  | "onImportInputChange"
  | "onImageInputChange"
  | "onDragOver"
  | "onDrop"
  | "onEditorMouseDown"
  | "onSurfaceMouseDown"
  | "onSurfaceClick"
  | "onSurfaceMouseMove"
  | "onSurfaceDblClick"
  | "onParagraphMouseDown"
  | "onRevisionMouseEnter"
  | "onRevisionMouseLeave"
  | "onImageMouseDown"
  | "onImageResizeHandleMouseDown"
  | "onTableDragHandleMouseDown"
  | "onInputBlur"
  | "onInputFocus"
  | "onCompositionEnd"
  | "onCompositionStart"
  | "onCopy"
  | "onCut"
  | "onInput"
  | "onKeyDown"
  | "onPaste"
  | "onEditorContextMenu"
>;

export interface ShellProps extends ForwardedEditorProps {
  state: EditorState;
  toolbarHost: () => ToolbarHost;
  persistenceStatus: () => string;
  toolbarRegistry: ToolbarRegistry;
  showChrome: boolean;
  showTitleBar: boolean;
  showMenubar: boolean;
  showToolbar: boolean;
  showOutline: boolean;
  isReadOnly: boolean;
  measuredBlockHeights: Accessor<Record<string, number>>;
  measuredParagraphLayouts: Accessor<Record<string, EditorLayoutParagraph>>;
  viewportHeight: Accessor<number | string | undefined>;
  showFloatingTableToolbar: Accessor<boolean>;
}

export function DocumentShell(props: ShellProps) {
  let surfaceEl: HTMLDivElement | undefined;
  let viewportEl: HTMLDivElement | undefined;
  const captureSurfaceRef = (el: HTMLDivElement) => {
    surfaceEl = el;
    props.onSurfaceRef?.(el);
  };
  const captureViewportRef = (el: HTMLDivElement) => {
    viewportEl = el;
    props.onViewportRef?.(el);
  };
  const handleOutlineNavigate = (id: string) => {
    if (!surfaceEl) return;
    const snapshot = buildCanvasLayoutSnapshot({
      surface: surfaceEl,
      state: props.state,
      layoutMode: props.layoutMode ?? "wordParity",
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
        <Show when={props.showTitleBar} fallback={<Show when={props.showMenubar}><Menubar host={props.toolbarHost} /></Show>}>
          <TitleBar>
            <Show when={props.showMenubar}>
              <Menubar host={props.toolbarHost} />
            </Show>
          </TitleBar>
        </Show>
        <Show when={props.showToolbar}>
          <Toolbar
            host={props.toolbarHost}
            registry={props.toolbarRegistry}
            showFileGroup={!props.showMenubar}
          />
        </Show>
      </Show>

      <div class="oasis-editor-main-container">
        <Show when={props.showChrome && props.showOutline}>
          <OutlinePanel
            state={props.state}
            onNavigate={handleOutlineNavigate}
            surfaceRef={() => surfaceEl}
            viewportRef={() => viewportEl}
          />
        </Show>
        <section class="oasis-editor-stage">
          <OasisEditorEditor
            state={() => props.state}
            measuredBlockHeights={() => props.measuredBlockHeights()}
            measuredParagraphLayouts={() => props.measuredParagraphLayouts()}
            selectionBoxes={() => props.selectionBoxes()}
            selectedImageBox={() => props.selectedImageBox()}
            toolbarHost={props.toolbarHost}
            persistenceStatus={() => props.persistenceStatus()}
            showFloatingTableToolbar={() => props.showFloatingTableToolbar()}
            caretBox={() => props.caretBox()}
            inputBox={() => props.inputBox()}
            hoveredRevision={() => props.hoveredRevision()}
            focused={() => props.focused()}
            importProgress={props.importProgress}
            layoutMode={props.layoutMode}

            viewportHeight={props.viewportHeight()}
            class={props.class}
            style={props.style}
            readOnly={props.isReadOnly}
            showCaret={() => props.showCaret()}
            onViewportRef={captureViewportRef}
            onSurfaceRef={captureSurfaceRef}
            onTextareaRef={props.onTextareaRef}
            onImportInputRef={props.onImportInputRef}
            onImageInputRef={props.onImageInputRef}
            onImportInputChange={props.onImportInputChange}
            onImageInputChange={props.onImageInputChange}
            onDragOver={props.onDragOver}
            onDrop={props.onDrop}
            onEditorMouseDown={props.onEditorMouseDown}
            onSurfaceMouseDown={props.onSurfaceMouseDown}
            onSurfaceClick={props.onSurfaceClick}
            onSurfaceMouseMove={props.onSurfaceMouseMove}
            onSurfaceDblClick={props.onSurfaceDblClick}
            onParagraphMouseDown={props.onParagraphMouseDown}
            onRevisionMouseEnter={props.onRevisionMouseEnter}
            onRevisionMouseLeave={props.onRevisionMouseLeave}
            onImageMouseDown={props.onImageMouseDown}
            onImageResizeHandleMouseDown={props.onImageResizeHandleMouseDown}
            onTableDragHandleMouseDown={props.onTableDragHandleMouseDown}
            onInputBlur={props.onInputBlur}
            onInputFocus={props.onInputFocus}
            onCompositionEnd={props.onCompositionEnd}
            onCompositionStart={props.onCompositionStart}
            onCopy={props.onCopy}
            onCut={props.onCut}
            onInput={props.onInput}
            onKeyDown={props.onKeyDown}
            onPaste={props.onPaste}
            onEditorContextMenu={props.onEditorContextMenu}
          />
        </section>
      </div>
    </>
  );
}

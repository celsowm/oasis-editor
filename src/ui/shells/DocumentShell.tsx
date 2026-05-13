import { Show, type JSX } from "solid-js";
import { Menubar } from "../components/Menubar/Menubar.js";
import { TitleBar } from "../components/TitleBar/TitleBar.js";
import { OutlinePanel } from "../components/Outline/OutlinePanel.js";
import { EditorToolbar } from "../components/Toolbar/EditorToolbar.js";
import { OasisEditorEditor } from "../OasisEditorEditor.js";
import type { EditorToolbarCtx } from "../components/Toolbar/types.js";
import { t } from "../../i18n/index.js";

export interface ShellProps {
  state: any;
  setState: any;
  toolbarCtx: EditorToolbarCtx;
  showChrome: boolean;
  showTitleBar: boolean;
  showMenubar: boolean;
  showToolbar: boolean;
  showOutline: boolean;
  isReadOnly: boolean;
  measuredBlockHeights: any;
  measuredParagraphLayouts: any;
  layoutMode?: "fast" | "wordParity";
  viewportHeight: any;
  class?: string;
  style?: JSX.CSSProperties;
  
  // Passed-through OasisEditorEditor props
  selectionBoxes: any;
  showFloatingTableToolbar: any;
  caretBox: any;
  inputBox: any;
  hoveredRevision: any;
  focused: any;
  showCaret: any;
  importProgress?: any;
  
  // Refs
  onViewportRef: any;
  onSurfaceRef: any;
  onTextareaRef: any;
  onImportInputRef: any;
  onImageInputRef: any;

  // Handlers
  onImportInputChange: any;
  onImageInputChange: any;
  onDragOver: any;
  onDrop: any;
  onEditorMouseDown: any;
  onSurfaceMouseDown: any;
  onSurfaceMouseMove: any;
  onSurfaceDblClick: any;
  onParagraphMouseDown: any;
  onRevisionMouseEnter: any;
  onRevisionMouseLeave: any;
  onImageMouseDown: any;
  onImageResizeHandleMouseDown: any;
  onTableDragHandleMouseDown: any;
  onInputBlur: any;
  onInputFocus: any;
  onCompositionEnd: any;
  onCompositionStart: any;
  onCopy: any;
  onCut: any;
  onInput: any;
  onKeyDown: any;
  onPaste: any;
}

export function DocumentShell(props: ShellProps) {
  return (
    <>
      <Show when={props.showChrome}>
        <Show when={props.showTitleBar} fallback={<Show when={props.showMenubar}><Menubar ctx={props.toolbarCtx} /></Show>}>
          <TitleBar
            title={props.state.document.metadata?.title || t("title.untitled")}
            onTitleChange={(newTitle: string) => {
              if (props.state.document.metadata) {
                props.setState("document", "metadata", "title", newTitle);
              } else {
                props.setState("document", "metadata", { title: newTitle });
              }
            }}
          >
            <Show when={props.showMenubar}>
              <Menubar ctx={props.toolbarCtx} />
            </Show>
          </TitleBar>
        </Show>
        <Show when={props.showToolbar}>
          <EditorToolbar
            ctx={props.toolbarCtx}
            showFileGroup={!props.showMenubar}
          />
        </Show>
      </Show>

      <div class="oasis-editor-main-container">
        <Show when={props.showChrome && props.showOutline}>
          <OutlinePanel
            state={props.state}
            onNavigate={(id) => {
              const el = document.querySelector(`[data-paragraph-id="${id}"]`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          />
        </Show>
        <section class="oasis-editor-stage">
          <OasisEditorEditor
            state={() => props.state}
            measuredBlockHeights={() => props.measuredBlockHeights()}
            measuredParagraphLayouts={() => props.measuredParagraphLayouts()}
            selectionBoxes={() => props.selectionBoxes()}
            toolbarCtx={() => props.toolbarCtx}
            showFloatingTableToolbar={() => props.showFloatingTableToolbar()}
            caretBox={() => props.caretBox()}
            inputBox={() => props.inputBox()}
            hoveredRevision={() => props.hoveredRevision()}
            focused={() => props.focused()}
            importProgress={props.importProgress ? () => props.importProgress() : undefined}
            layoutMode={props.layoutMode}
            viewportHeight={props.viewportHeight()}
            class={props.class}
            style={props.style}
            readOnly={props.isReadOnly}
            showCaret={() => props.showCaret()}
            onViewportRef={props.onViewportRef}
            onSurfaceRef={props.onSurfaceRef}
            onTextareaRef={props.onTextareaRef}
            onImportInputRef={props.onImportInputRef}
            onImageInputRef={props.onImageInputRef}
            onImportInputChange={props.onImportInputChange}
            onImageInputChange={props.onImageInputChange}
            onDragOver={props.onDragOver}
            onDrop={props.onDrop}
            onEditorMouseDown={props.onEditorMouseDown}
            onSurfaceMouseDown={props.onSurfaceMouseDown}
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
          />
        </section>
      </div>
    </>
  );
}

import { Show } from "solid-js";
import { EditorToolbar } from "../components/Toolbar/EditorToolbar.js";
import { OasisEditorEditor } from "../OasisEditorEditor.js";
import type { ShellProps } from "./DocumentShell.js";

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
        <EditorToolbar ctx={props.toolbarCtx} />
      </Show>
      <div class="oasis-editor-main-container">
        <section class="oasis-editor-stage" style={{ padding: "0" }}>
          <OasisEditorEditor
            state={() => props.state}
            measuredBlockHeights={() => props.measuredBlockHeights()}
            measuredParagraphLayouts={() => props.measuredParagraphLayouts()}
            selectionBoxes={() => props.selectionBoxes()}
            selectedImageBox={() => props.selectedImageBox()}
            toolbarCtx={() => props.toolbarCtx}
            showFloatingTableToolbar={() => props.showFloatingTableToolbar()}
            caretBox={() => props.caretBox()}
            inputBox={() => props.inputBox()}
            hoveredRevision={() => props.hoveredRevision()}
            focused={() => props.focused()}
            importProgress={props.importProgress ? () => props.importProgress() : undefined}
            layoutMode={props.layoutMode}

            viewportHeight={props.viewportHeight()}            class={props.class}
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
          />
        </section>
      </div>
    </div>
  );
}

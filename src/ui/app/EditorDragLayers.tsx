import { Show } from "solid-js";
import { DropCaret } from "@/ui/components/DropCaret.js";
import type { EditorState } from "@/core/model.js";
import type { createEditorImageOperations } from "@/app/controllers/useEditorImageOperations.js";
import type { createEditorTableResize } from "@/app/controllers/useEditorTableResize.js";
import type { createEditorTableDrag } from "@/app/controllers/useEditorTableDrag.js";
import type { createEditorTextDrag } from "@/app/controllers/useEditorTextDrag.js";

export interface EditorDragLayersProps {
  state: EditorState;
  surfaceRef: HTMLDivElement | undefined;
  tableResize: ReturnType<typeof createEditorTableResize>;
  imageOps: ReturnType<typeof createEditorImageOperations>;
  tableDrag: ReturnType<typeof createEditorTableDrag>;
  textDrag: ReturnType<typeof createEditorTextDrag>;
}

/**
 * Presentational floating layers that visualize active drag/resize gestures:
 * the table resize guide, image/table drag ghosts and the various drop carets.
 * Holds no editor logic — it only binds gesture controller state to DOM.
 */
export function EditorDragLayers(props: EditorDragLayersProps) {
  return (
    <>
      <Show when={props.tableResize.resizing()}>
        {(resizing) => (
          <div
            class="oasis-editor-table-resize-guide"
            classList={{
              "oasis-editor-table-resize-guide-column":
                resizing().type === "column",
              "oasis-editor-table-resize-guide-row": resizing().type === "row",
            }}
            style={{
              ...(resizing().type === "column"
                ? {
                    left: `${resizing().currentPos}px`,
                    top: `${resizing().guideBounds.top}px`,
                    width: "0px",
                    height: `${resizing().guideBounds.height}px`,
                  }
                : {
                    left: `${resizing().guideBounds.left}px`,
                    top: `${resizing().currentPos}px`,
                    width: `${resizing().guideBounds.width}px`,
                    height: "0px",
                  }),
            }}
          />
        )}
      </Show>

      <Show
        when={props.imageOps.dragging() && props.imageOps.draggedImageInfo()}
      >
        {(info) => (
          <img
            src={info().src}
            class="oasis-editor-image-ghost"
            style={{
              width: `${info().width}px`,
              height: `${info().height}px`,
              left: `${props.imageOps.mousePos().x - info().offsetX}px`,
              top: `${props.imageOps.mousePos().y - info().offsetY}px`,
            }}
          />
        )}
      </Show>

      <Show
        when={props.tableDrag.dragging() && props.tableDrag.draggedTableInfo()}
      >
        {(info) => (
          <div
            class="oasis-editor-table-ghost"
            style={{
              width: `${info().width}px`,
              height: `${info().height}px`,
              left: `${props.tableDrag.mousePos().x - info().offsetX}px`,
              top: `${props.tableDrag.mousePos().y - info().offsetY}px`,
            }}
          />
        )}
      </Show>

      <Show
        when={props.tableDrag.dragging() && props.tableDrag.dropTargetPos()}
      >
        {(pos) => (
          <DropCaret
            surfaceRef={props.surfaceRef}
            state={props.state}
            targetPos={pos}
          />
        )}
      </Show>

      <Show when={props.imageOps.dragging() && props.imageOps.dropTargetPos()}>
        {(pos) => (
          <DropCaret
            surfaceRef={props.surfaceRef}
            state={props.state}
            targetPos={pos}
          />
        )}
      </Show>

      <Show when={props.textDrag.dragging() && props.textDrag.dropTargetPos()}>
        {(pos) => (
          <DropCaret
            surfaceRef={props.surfaceRef}
            state={props.state}
            targetPos={pos}
            pointerPos={props.textDrag.pointerPos}
            caretViewport={props.textDrag.caretViewport}
          />
        )}
      </Show>
    </>
  );
}

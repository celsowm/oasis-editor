import { Show } from "solid-js";
import { JSX } from "solid-js";
import type { SelectedTableBox } from "@/ui/editorUiTypes.js";

export interface TableHandlesOverlayProps {
  /** Bounding box of the table containing the caret, or `null`. */
  box: () => SelectedTableBox | null;
  readOnly: boolean;
  /** Press on the top-left move handle (drag/reorder the whole table). */
  onMoveStart: (event: MouseEvent & { currentTarget: HTMLElement }) => void;
  /** Press on the bottom-right corner handle (proportional resize). */
  onResizeStart: (event: MouseEvent & { currentTarget: HTMLElement }) => void;
}

/**
 * Word-style table handles: a move grip at the top-left and a resize grip at
 * the bottom-right, shown while the caret is inside a table. Positioned in the
 * same surface-relative content space as the image/text-box selection overlay.
 */
export function TableHandlesOverlay(
  props: TableHandlesOverlayProps,
): JSX.Element {
  return (
    <Show when={!props.readOnly && props.box()}>
      {(box): JSX.Element => (
        <div
          aria-hidden="true"
          class="oasis-editor-table-handles-overlay"
          style={{
            left: `${box().left}px`,
            top: `${box().top}px`,
            width: `${box().width}px`,
            height: `${box().height}px`,
          }}
        >
          <button
            aria-hidden="true"
            class="oasis-editor-table-move-handle"
            tabIndex={-1}
            type="button"
            onMouseDown={(event): void => {
              props.onMoveStart(
                event as MouseEvent & { currentTarget: HTMLElement },
              );
            }}
          />
          <button
            aria-hidden="true"
            class="oasis-editor-table-resize-corner"
            tabIndex={-1}
            type="button"
            onMouseDown={(event): void => {
              props.onResizeStart(
                event as MouseEvent & { currentTarget: HTMLElement },
              );
            }}
          />
        </div>
      )}
    </Show>
  );
}

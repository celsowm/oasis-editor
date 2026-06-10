import { For, Show } from "solid-js";
import {
  RESIZE_HANDLE_DIRECTIONS,
  type ResizeHandleDirection,
} from "../resizeGeometry.js";

export interface ResizeHandlesOverlayBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ResizeHandlesOverlayProps {
  /** The selected object's box, or `null` when nothing is selected. */
  box: () => ResizeHandlesOverlayBox | null;
  readOnly: boolean;
  /** Variant class appended to the shared overlay class (image vs text box). */
  variantClass: string;
  onResizeStart: (
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  /** Optional handler for pressing the overlay body (e.g. image drag-to-move). */
  onBodyMouseDown?: (
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
}

/**
 * Renders the 8-handle selection overlay used to resize a floating/inline
 * object. Shared by image and text-box selection so the handle geometry,
 * positioning and pointer plumbing live in one place.
 */
export function ResizeHandlesOverlay(props: ResizeHandlesOverlayProps) {
  return (
    <div
      aria-hidden="true"
      class={`oasis-editor-selection-overlay ${props.variantClass}`}
      style={{
        display: props.box() ? undefined : "none",
        left: `${props.box()?.left ?? 0}px`,
        top: `${props.box()?.top ?? 0}px`,
        width: `${props.box()?.width ?? 0}px`,
        height: `${props.box()?.height ?? 0}px`,
        "pointer-events": !props.readOnly && props.box() ? "auto" : "none",
      }}
      onMouseDown={(event) => {
        if (props.readOnly || !props.box() || !props.onBodyMouseDown) {
          return;
        }
        event.preventDefault();
        props.onBodyMouseDown(
          event as MouseEvent & { currentTarget: HTMLElement },
        );
      }}
    >
      <Show when={!props.readOnly}>
        <For each={RESIZE_HANDLE_DIRECTIONS}>
          {(direction) => (
            <button
              aria-hidden="true"
              class="oasis-editor-resize-handle"
              data-direction={direction}
              tabIndex={-1}
              type="button"
              onMouseDown={(event) => {
                if (!props.box()) {
                  return;
                }
                props.onResizeStart(
                  direction,
                  event as MouseEvent & { currentTarget: HTMLElement },
                );
              }}
            />
          )}
        </For>
      </Show>
    </div>
  );
}

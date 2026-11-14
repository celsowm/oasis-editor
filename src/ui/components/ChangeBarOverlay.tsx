import { For, type Accessor, type JSX } from "solid-js";
import type { ChangeBarBox } from "@/ui/editorUiTypes.js";

export interface ChangeBarOverlayProps {
  boxes: Accessor<ChangeBarBox[]>;
}

/**
 * Paints Word-style Simple Markup change bars: a thin vertical line in the left
 * margin next to each paragraph that contains a tracked change. Presentational
 * only — hit-testing and editing stay on the (read-only) canvas underneath.
 */
export function ChangeBarOverlay(props: ChangeBarOverlayProps): JSX.Element {
  return (
    <div class="oasis-editor-change-bar-root">
      <For each={props.boxes()}>
        {(box): JSX.Element => (
          <span
            class="oasis-editor-change-bar"
            data-testid="editor-change-bar"
            data-paragraph-id={box.paragraphId}
            style={{
              left: `${box.left}px`,
              top: `${box.top}px`,
              height: `${box.height}px`,
            }}
          />
        )}
      </For>
    </div>
  );
}

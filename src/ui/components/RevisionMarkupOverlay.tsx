import { For, type JSX } from "solid-js";
import type { RevisionMarkupBox } from "@/ui/editorUiTypes.js";
import type { Accessor } from "solid-js";

export interface RevisionMarkupOverlayProps {
  boxes: Accessor<RevisionMarkupBox[]>;
}

/**
 * Paints Word-style track-changes decorations over the canvas: a solid green
 * underline for insertions and a red strike-through for deletions. Presentational
 * only — hit-testing and editing stay on the canvas surface underneath.
 */
export function RevisionMarkupOverlay(
  props: RevisionMarkupOverlayProps,
): JSX.Element {
  return (
    <div class="oasis-editor-revision-markup-root">
      <For each={props.boxes()}>
        {(box): JSX.Element => (
          <span
            class="oasis-editor-revision-markup"
            classList={{
              "oasis-editor-revision-markup-insert": box.type === "insert",
              "oasis-editor-revision-markup-delete": box.type === "delete",
            }}
            data-testid="editor-revision-markup"
            data-revision-type={box.type}
            data-revision-id={box.revisionId}
            style={{
              left: `${box.left}px`,
              top: `${box.top}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
            }}
          />
        )}
      </For>
    </div>
  );
}

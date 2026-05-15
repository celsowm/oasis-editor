import type { EditorSurfaceProps } from "../editorUiTypes.js";
import { DOMEditorSurface } from "./DOMEditorSurface.js";

export function SemanticDOMMirror(props: EditorSurfaceProps) {
  return (
    <div
      class="oasis-editor-semantic-dom-mirror"
      data-semantic-mirror="true"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: "0",
        opacity: 0,
        "pointer-events": "none",
        "z-index": 0,
      }}
    >
      <DOMEditorSurface {...props} />
    </div>
  );
}

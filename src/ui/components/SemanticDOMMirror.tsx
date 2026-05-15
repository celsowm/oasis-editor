import type { EditorSurfaceProps } from "../editorUiTypes.js";
import { DOMEditorSurface } from "./DOMEditorSurface.js";

export function SemanticDOMMirror(props: EditorSurfaceProps) {
  return (
    <div
      // Compatibility-only mirror for integrations that still expect DOM nodes.
      // Canvas is the visual source of truth; this mirror is intentionally hidden
      // from assistive technology and must not be used for geometry decisions.
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

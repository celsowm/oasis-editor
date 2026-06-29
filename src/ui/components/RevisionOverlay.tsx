import type { JSX } from "solid-js";
import { type RevisionBox } from "@/ui/editorUiTypes.js";

export interface RevisionOverlayProps {
  box: RevisionBox;
}

export function RevisionOverlay(props: RevisionOverlayProps): JSX.Element {
  const formattedDate = (): string => {
    try {
      return new Date(props.box.date).toLocaleString();
    } catch (e) {
      return "Data desconhecida";
    }
  };

  const label = (): string => {
    if (props.box.type === "insert") return "Inserido por";
    if (props.box.type === "delete") return "Excluído por";
    return "Alterado por";
  };

  return (
    <div
      class="oasis-editor-revision-overlay"
      style={{
        left: `${props.box.left}px`,
        top: `${props.box.top - 40}px`, // Show above the text
      }}
      data-testid="editor-revision-overlay"
    >
      <div class="oasis-editor-revision-overlay-content">
        <span class="oasis-editor-revision-overlay-author">
          <strong>{label()}:</strong> {props.box.author}
        </span>
        <span class="oasis-editor-revision-overlay-date">
          {formattedDate()}
        </span>
      </div>
      <div class="oasis-editor-revision-overlay-arrow" />
    </div>
  );
}

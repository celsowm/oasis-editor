import { type RevisionBox } from "../editorUiTypes.js";

export interface RevisionOverlayProps {
  box: RevisionBox;
}

export function RevisionOverlay(props: RevisionOverlayProps) {
  const formattedDate = () => {
    try {
      return new Date(props.box.date).toLocaleString();
    } catch (e) {
      return "Data desconhecida";
    }
  };

  const label = () => (props.box.type === "insert" ? "Inserido por" : "Excluído por");

  return (
    <div
      class="oasis-editor-2-revision-overlay"
      style={{
        left: `${props.box.left}px`,
        top: `${props.box.top - 40}px`, // Show above the text
      }}
      data-testid="editor-2-revision-overlay"
    >
      <div class="oasis-editor-2-revision-overlay-content">
        <span class="oasis-editor-2-revision-overlay-author">
          <strong>{label()}:</strong> {props.box.author}
        </span>
        <span class="oasis-editor-2-revision-overlay-date">{formattedDate()}</span>
      </div>
      <div class="oasis-editor-2-revision-overlay-arrow" />
    </div>
  );
}

import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";

export function ReviewGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state;

  return (
    <ToolbarGroup>
      <ToolbarButton
        icon="eye"
        label="Track"
        wide
        active={state().trackChangesEnabled}
        data-testid="editor-2-toolbar-track-changes"
        onClick={() => ctx().applyToggleTrackChangesCommand()}
        tooltip="Toggle Track Changes"
      />
      <ToolbarButton
        icon="check"
        label="Accept"
        data-testid="editor-2-toolbar-accept-revisions"
        disabled={ctx().selectionCollapsed()}
        onClick={() => ctx().applyAcceptRevisionsCommand()}
        tooltip="Accept Revisions"
      />
      <ToolbarButton
        icon="x"
        label="Reject"
        data-testid="editor-2-toolbar-reject-revisions"
        disabled={ctx().selectionCollapsed()}
        onClick={() => ctx().applyRejectRevisionsCommand()}
        tooltip="Reject Revisions"
      />
    </ToolbarGroup>
  );
}

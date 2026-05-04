import { type JSX } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarDropdown } from "../ToolbarDropdown.js";

export function ReviewGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state;

  return (
    <ToolbarGroup>
      <ToolbarDropdown label="Review" icon="message-square" testId="editor-toolbar-review-dropdown">
        <ToolbarButton
          icon="eye"
          label="Track Changes"
          wide
          active={state().trackChangesEnabled}
          data-testid="editor-toolbar-track-changes"
          onClick={() => ctx().applyToggleTrackChangesCommand()}
          tooltip="Toggle Track Changes"
        />
        <ToolbarButton
          icon="check"
          label="Accept"
          wide
          data-testid="editor-toolbar-accept-revisions"
          disabled={ctx().selectionCollapsed()}
          onClick={() => ctx().applyAcceptRevisionsCommand()}
          tooltip="Accept Revisions"
        />
        <ToolbarButton
          icon="x"
          label="Reject"
          wide
          data-testid="editor-toolbar-reject-revisions"
          disabled={ctx().selectionCollapsed()}
          onClick={() => ctx().applyRejectRevisionsCommand()}
          tooltip="Reject Revisions"
        />
      </ToolbarDropdown>
    </ToolbarGroup>
  );
}

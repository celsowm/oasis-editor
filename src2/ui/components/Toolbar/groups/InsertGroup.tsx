import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";

export function InsertGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t = () => ctx().toolbarStyleState();

  return (
    <ToolbarGroup>
      <ToolbarButton
        icon="link"
        label="Link"
        wide
        active={Boolean(t().link)}
        data-testid="editor-2-toolbar-link"
        disabled={ctx().selectionCollapsed() && !t().link}
        onClick={() => ctx().promptForLink()}
        tooltip="Insert Link"
      />
      <ToolbarButton
        icon="unlink"
        label="Unlink"
        wide
        data-testid="editor-2-toolbar-unlink"
        disabled={!t().link}
        onClick={() => ctx().removeLinkCommand()}
        tooltip="Remove Link"
      />
    </ToolbarGroup>
  );
}

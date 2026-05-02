import { For } from "solid-js";
import type { EditorToolbarCtx } from "../EditorToolbar.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { booleanButtons } from "../toolbarConfig.js";

export function FormatGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t = () => ctx().toolbarStyleState();

  return (
    <ToolbarGroup>
      <For each={booleanButtons}>
        {(button) => (
          <ToolbarButton
            icon={button.icon}
            active={!!t()[button.key]}
            data-testid={button.testId}
            disabled={ctx().selectionCollapsed()}
            onClick={() => ctx().applyBooleanStyleCommand(button.key)}
            tooltip={button.label}
          />
        )}
      </For>
    </ToolbarGroup>
  );
}

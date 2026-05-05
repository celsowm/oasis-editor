import { For } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { booleanButtons } from "../toolbarConfig.js";
import { t } from "../../../../i18n/index.js";

export function FormatGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();

  return (
    <ToolbarGroup>
      <For each={booleanButtons}>
        {(button) => (
          <ToolbarButton
            icon={button.icon}
            active={!!t_style()[button.key]}
            data-testid={button.testId}
            onClick={() => ctx().applyBooleanStyleCommand(button.key)}
            tooltip={t(`toolbar.${button.key}` as any)}
          />
        )}
      </For>
    </ToolbarGroup>
  );
}

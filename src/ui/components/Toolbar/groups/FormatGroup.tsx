import { For } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { booleanButtons } from "../toolbarConfig.js";
import { t } from "../../../../i18n/index.js";

/**
 * Format buttons (Bold, Italic, Underline, etc.) rendered as
 * individual items — NOT wrapped in a ToolbarGroup — so the
 * OverflowManager can move them one-by-one instead of all-or-nothing.
 */
export function FormatGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();

  return (
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
  );
}

import type { CommandRef } from "@/core/commands/CommandRef.js";
import type {
  ToolbarActionApi,
  ToolbarItem, ToolbarCommandState } from "@/ui/components/Toolbar/schema/items.js";

export interface ItemBinding {
  active: () => boolean;
  disabled: () => boolean;
  value: () => unknown;
  visible: () => boolean;
}

const itemCommand = (item: ToolbarItem): CommandRef | undefined =>
  "command" in item ? item.command : undefined;

/**
 * Resolves an item's reactive display state. Per-item overrides win; otherwise
 * the bound command's state is used (DIP — controls never read editor internals).
 */
export function bindItem(
  item: ToolbarItem,
  api: ToolbarActionApi,
): ItemBinding {
  const command = itemCommand(item);
  const cmdState = (): ToolbarCommandState =>
    command
      ? api.commands.state(command)
      : { isEnabled: true, isActive: false, value: undefined };

  const overrides = item.type === "separator" ? undefined : item;

  return {
    active: (): any => overrides?.isActive?.(api) ?? cmdState().isActive,
    disabled: (): boolean => overrides?.isDisabled?.(api) ?? !cmdState().isEnabled,
    value: (): any => overrides?.value?.(api) ?? cmdState().value,
    visible: (): boolean => overrides?.isVisible?.(api) ?? true,
  };
}

/** Unified action dispatch through the command registry. */
export function runItem(
  item: { command: CommandRef },
  api: ToolbarActionApi,
): void {
  if (api.commands.canExecute(item.command)) {
    api.commands.execute(item.command);
  }
}

/** Resolve a tooltip from `tooltipKey` (i18n) or literal `tooltip`. */
export function resolveTooltip(
  item: { tooltipKey?: Parameters<ToolbarActionApi["t"]>[0]; tooltip?: string },
  api: ToolbarActionApi,
): string | undefined {
  if (item.tooltip) return item.tooltip;
  if (item.tooltipKey) return api.t(item.tooltipKey);
  return undefined;
}

/** Resolve a label from `labelKey` (i18n) or literal `label`. */
export function resolveLabel(
  item: { labelKey?: Parameters<ToolbarActionApi["t"]>[0]; label?: string },
  api: ToolbarActionApi,
): string | undefined {
  if (item.label) return item.label;
  if (item.labelKey) return api.t(item.labelKey);
  return undefined;
}

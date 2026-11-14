import type { ToolbarItem } from "@/ui/components/Toolbar/schema/items.js";
import type { MenuItem } from "@/ui/components/Menubar/menuRegistry.js";
import type { CommandRef } from "@/core/commands/CommandRef.js";
import type { TranslateFn } from "@/i18n/index.js";
import type { CommandSearchEntry } from "@/core/commands/commandSearch.js";

interface ToolbarCommandSpec {
  command: string;
  payload?: unknown;
}

function commandSpecOf(
  command: CommandRef | undefined,
): ToolbarCommandSpec | null {
  if (!command) return null;
  if (typeof command === "string") return { command };
  if (typeof command === "object" && typeof command.name === "string") {
    return {
      command: command.name,
      payload: command.payload,
    };
  }
  return null;
}

function toolbarCommandOf(item: ToolbarItem): ToolbarCommandSpec | null {
  return commandSpecOf((item as { command?: CommandRef }).command);
}

/**
 * Derive the searchable command surface from the same registries the UI
 * renders from, so palette results can never drift from what the app shows.
 * Ribbon wins over the menubar when both describe the same command.
 */
export function buildCommandSearchEntries(
  toolbarItems: ToolbarItem[],
  menuItems: MenuItem[],
  t: TranslateFn,
): CommandSearchEntry[] {
  const entries: CommandSearchEntry[] = [];
  const seen = new Set<string>();

  for (const item of toolbarItems) {
    if ("hidden" in item && item.hidden === true) continue;
    const spec = toolbarCommandOf(item);
    if (!spec) continue;
    const label = (item as { label?: unknown }).label;
    if (typeof label !== "string" || !label.trim()) continue;
    if (seen.has(spec.command)) continue;
    seen.add(spec.command);
    const entry: CommandSearchEntry = {
      id: item.id,
      label,
      command: spec.command,
      ...(spec.payload === undefined ? {} : { payload: spec.payload }),
      source: "ribbon",
    };
    entries.push(entry);
  }

  for (const item of menuItems) {
    if (item.hidden === true) continue;
    const spec = commandSpecOf(item.command);
    if (!spec) continue;
    if (seen.has(spec.command)) continue;
    seen.add(spec.command);
    const label = item.labelKey ? t(item.labelKey) : item.id;
    entries.push({
      id: item.id,
      label: String(label),
      command: spec.command,
      ...(spec.payload === undefined ? {} : { payload: spec.payload }),
      source: "menubar",
      ...(item.shortcut ? { shortcut: item.shortcut } : {}),
    });
  }

  return entries;
}

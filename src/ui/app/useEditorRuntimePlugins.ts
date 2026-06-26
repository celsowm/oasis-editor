import type { OasisPlugin } from "@/core/plugin.js";
import type { TranslateFn } from "@/i18n/index.js";
import { defaultMenuItems } from "@/ui/components/Menubar/defaultMenuItems.js";
import { MenuRegistry } from "@/ui/components/Menubar/menuRegistry.js";
import { createDefaultToolbarPreset } from "@/ui/components/Toolbar/presets/defaultToolbar.js";
import {
  createToolbarRegistry,
  type ToolbarRegistry,
} from "@/ui/components/Toolbar/registry/ToolbarRegistry.js";
import type { ToolbarItem } from "@/ui/components/Toolbar/schema/items.js";

export interface EditorRuntimePluginsOptions {
  essentialsPlugin: OasisPlugin;
  externalPlugins?: OasisPlugin[];
  t: TranslateFn;
  customizeToolbar?: (registry: ToolbarRegistry) => void;
  customizeMenubar?: (registry: MenuRegistry) => void;
}

export interface EditorRuntimePlugins {
  runtimePlugins: OasisPlugin[];
  toolbarRegistry: ToolbarRegistry;
  menuRegistry: MenuRegistry;
  dispose: () => void;
}

export function useEditorRuntimePlugins(
  options: EditorRuntimePluginsOptions,
): EditorRuntimePlugins {
  const runtimePlugins = [
    options.essentialsPlugin,
    ...(options.externalPlugins ?? []),
  ];
  const contributedToolbarIds: string[] = [];
  const contributedMenuIds: string[] = [];
  const toolbarRegistry = createToolbarRegistry();
  const menuRegistry = new MenuRegistry();

  for (const item of createDefaultToolbarPreset(options.t)) {
    toolbarRegistry.register(item);
  }
  for (const item of defaultMenuItems) {
    menuRegistry.register(item);
  }

  for (const plugin of runtimePlugins) {
    for (const item of plugin.toolbar ?? []) {
      const contributed: ToolbarItem = {
        type: "button",
        id: item.id,
        testId: item.id,
        command: item.command,
        iconName: item.icon,
        tab: item.tab ?? "plugins",
        group: item.group ?? "general",
        row: item.row ?? 1,
        ribbonSize: item.ribbonSize,
        ribbonGroupResize: item.ribbonGroupResize,
        order: item.order,
      };
      toolbarRegistry.register(contributed);
      contributedToolbarIds.push(item.id);
    }

    for (const item of plugin.menubar ?? []) {
      menuRegistry.register({
        id: item.id,
        path: item.path,
        command: item.command,
        icon: item.icon,
        shortcut: item.shortcut,
      });
      contributedMenuIds.push(item.id);
    }
  }

  options.customizeToolbar?.(toolbarRegistry);
  options.customizeMenubar?.(menuRegistry);

  return {
    runtimePlugins,
    toolbarRegistry,
    menuRegistry,
    dispose: (): void => {
      for (const id of contributedToolbarIds) {
        toolbarRegistry.remove(id);
      }
      for (const id of contributedMenuIds) {
        menuRegistry.unregister(id);
      }
    },
  };
}

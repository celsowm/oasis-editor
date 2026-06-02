import type { OasisPlugin } from "../../core/plugin.js";
import { defaultMenuRegistry } from "../components/Menubar/menuRegistry.js";
import { createDefaultToolbarPreset } from "../components/Toolbar/presets/defaultToolbar.js";
import { createToolbarRegistry, type ToolbarRegistry } from "../components/Toolbar/registry/ToolbarRegistry.js";
import type { ToolbarItem } from "../components/Toolbar/schema/items.js";

export interface EditorRuntimePluginsOptions {
  essentialsPlugin: OasisPlugin;
  externalPlugins?: OasisPlugin[];
  customizeToolbar?: (registry: ToolbarRegistry) => void;
}

export interface EditorRuntimePlugins {
  runtimePlugins: OasisPlugin[];
  toolbarRegistry: ToolbarRegistry;
  dispose: () => void;
}

export function useEditorRuntimePlugins(options: EditorRuntimePluginsOptions): EditorRuntimePlugins {
  const runtimePlugins = [options.essentialsPlugin, ...(options.externalPlugins ?? [])];
  const contributedToolbarIds: string[] = [];
  const contributedMenuIds: string[] = [];
  const toolbarRegistry = createToolbarRegistry();

  for (const item of createDefaultToolbarPreset()) {
    toolbarRegistry.register(item);
  }

  for (const plugin of runtimePlugins) {
    for (const item of plugin.toolbar ?? []) {
      const contributed: ToolbarItem = {
        type: "button",
        id: item.id,
        testId: item.id,
        command: item.command,
        iconName: item.icon,
        group: item.group,
      };
      toolbarRegistry.register(contributed);
      contributedToolbarIds.push(item.id);
    }

    for (const item of plugin.menubar ?? []) {
      defaultMenuRegistry.register({
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

  return {
    runtimePlugins,
    toolbarRegistry,
    dispose: () => {
      for (const id of contributedToolbarIds) {
        toolbarRegistry.remove(id);
      }
      for (const id of contributedMenuIds) {
        defaultMenuRegistry.unregister(id);
      }
    },
  };
}

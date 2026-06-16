import { describe, expect, it } from "vitest";
import { createToolbarRegistry } from "../../../../src/ui/components/Toolbar/registry/ToolbarRegistry.js";
import { MenuRegistry } from "../../../../src/ui/components/Menubar/menuRegistry.js";
import { useEditorRuntimePlugins } from "../../../../src/ui/app/useEditorRuntimePlugins.js";
import { createDefaultToolbarPreset } from "../../../../src/ui/components/Toolbar/presets/defaultToolbar.js";
import { OASIS_TOOLBAR_ITEMS } from "../../../../src/ui/components/Toolbar/presets/builtinToolbarIds.js";
import { RIBBON_TABS } from "../../../../src/ui/components/Toolbar/schema/items.js";

describe("UI registries", () => {
  it("deduplicates and orders toolbar items", () => {
    const registry = createToolbarRegistry();

    registry.register({ id: "b", type: "button", command: "b", order: 20 });
    registry.register({ id: "a", type: "button", command: "a", order: 10 });
    registry.register({
      id: "a",
      type: "button",
      command: "a2",
      order: 5,
      tooltip: "updated",
    });

    expect(registry.getItems().map((item) => item.id)).toEqual(["a", "b"]);
    expect((registry.getItems()[0] as { tooltip?: string })?.tooltip).toBe(
      "updated",
    );

    registry.remove("a");
    expect(registry.getItems().map((item) => item.id)).toEqual(["b"]);
  });

  it("supports positional insertion, replacement, moving and removal", () => {
    const registry = createToolbarRegistry();
    registry.register({ id: "bold", type: "toggle", command: "bold" });
    registry.register({ id: "italic", type: "toggle", command: "italic" });

    registry.insertAfter("bold", {
      id: "brand",
      type: "button",
      command: "brand",
    });
    expect(registry.getOrdered().map((item) => item.id)).toEqual([
      "bold",
      "brand",
      "italic",
    ]);

    registry.replace("brand", {
      id: "brand",
      type: "button",
      command: "brand2",
    });
    expect((registry.get("brand") as { command?: string }).command).toBe(
      "brand2",
    );

    registry.move("brand", 0);
    expect(registry.getOrdered().map((item) => item.id)).toEqual([
      "brand",
      "bold",
      "italic",
    ]);

    registry.move("brand", { after: "italic" });
    expect(registry.getOrdered().map((item) => item.id)).toEqual([
      "bold",
      "italic",
      "brand",
    ]);

    registry.move("brand", { before: "bold" });
    expect(registry.getOrdered().map((item) => item.id)).toEqual([
      "brand",
      "bold",
      "italic",
    ]);
  });

  it("preserves ribbon placement metadata through toolbar registry operations", () => {
    const registry = createToolbarRegistry();
    registry.register({
      id: "font",
      type: "button",
      command: "font",
      tab: "home",
      group: "font",
      row: 1,
    });
    registry.insertAfter("font", {
      id: "ai",
      type: "button",
      command: "ai",
      tab: "ai",
      group: "assistant",
      row: 2,
    });

    expect(registry.get("ai")).toMatchObject({
      tab: "ai",
      group: "assistant",
      row: 2,
    });

    registry.replace("font", {
      id: "font",
      type: "button",
      command: "font2",
      tab: "home",
      group: "text",
      row: 2,
    });
    registry.move("ai", { before: "font" });

    expect(registry.getOrdered().map((item) => item.id)).toEqual([
      "ai",
      "font",
    ]);
    expect(registry.get("font")).toMatchObject({
      tab: "home",
      group: "text",
      row: 2,
    });
  });

  it("assigns every default toolbar item to a known ribbon tab, group and row", () => {
    const knownTabs = new Set<string>(RIBBON_TABS);
    const items = createDefaultToolbarPreset();

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(knownTabs.has(item.tab ?? "")).toBe(true);
      expect(item.group).toBeTruthy();
      expect([1, 2]).toContain(item.row);
    }

    expect(
      items.find((item) => item.id === OASIS_TOOLBAR_ITEMS.fontFamily),
    ).toMatchObject({ tab: "home", group: "font", row: 1 });
    expect(
      items.find((item) => item.id === OASIS_TOOLBAR_ITEMS.insertTable),
    ).toMatchObject({ tab: "insert", group: "tables", row: 1 });
    expect(
      items.find((item) => item.id === OASIS_TOOLBAR_ITEMS.specialIndent),
    ).toMatchObject({ tab: "home", group: "paragraph", row: 1 });
  });

  it("deduplicates and unregisters menu items", () => {
    const registry = new MenuRegistry();

    registry.register({ id: "file", path: "File", order: 10 });
    registry.register({ id: "edit", path: "Edit", order: 5 });
    registry.register({
      id: "edit",
      path: "Edit",
      order: 1,
      shortcut: "Ctrl+E",
    });

    expect(registry.getItems().map((item) => item.id)).toEqual([
      "edit",
      "file",
    ]);
    expect(registry.getItems()[0]?.shortcut).toBe("Ctrl+E");

    registry.unregister("edit");
    expect(registry.getItems().map((item) => item.id)).toEqual(["file"]);
  });

  it("keeps menubar customizations local to a runtime plugin registry", () => {
    const first = useEditorRuntimePlugins({
      essentialsPlugin: { name: "Essentials" },
      customizeMenubar(registry) {
        registry.register({
          id: "client_custom",
          path: "Tools/Client Custom",
          command: "clientCustom",
        });
      },
    });
    const second = useEditorRuntimePlugins({
      essentialsPlugin: { name: "Essentials" },
    });

    expect(
      first.menuRegistry
        .getItems()
        .some((item) => item.id === "client_custom"),
    ).toBe(true);
    expect(
      second.menuRegistry
        .getItems()
        .some((item) => item.id === "client_custom"),
    ).toBe(false);
  });

  it("places plugin toolbar items without explicit placement in Plugins General", () => {
    const runtime = useEditorRuntimePlugins({
      essentialsPlugin: { name: "Essentials" },
      externalPlugins: [
        {
          name: "Plugin",
          toolbar: [{ id: "plugin_action", command: "pluginAction" }],
        },
      ],
    });

    expect(runtime.toolbarRegistry.get("plugin_action")).toMatchObject({
      tab: "plugins",
      group: "general",
      row: 1,
    });
  });
});

import { describe, expect, it } from "vitest";
import { createToolbarRegistry } from "../../../../src/ui/components/Toolbar/registry/ToolbarRegistry.js";
import { MenuRegistry } from "../../../../src/ui/components/Menubar/menuRegistry.js";
import { useEditorRuntimePlugins } from "../../../../src/ui/app/useEditorRuntimePlugins.js";

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
});

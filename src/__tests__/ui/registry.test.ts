import { describe, expect, it } from "vitest";
import { ToolbarRegistry } from "../../ui/components/Toolbar/toolbarRegistry.js";
import { MenuRegistry } from "../../ui/components/Menubar/menuRegistry.js";

describe("UI registries", () => {
  it("deduplicates and orders toolbar items", () => {
    const registry = new ToolbarRegistry();

    registry.register({ id: "b", type: "button", order: 20 });
    registry.register({ id: "a", type: "button", order: 10 });
    registry.register({ id: "a", type: "button", order: 5, tooltip: "updated" });

    expect(registry.getItems().map((item) => item.id)).toEqual(["a", "b"]);
    expect(registry.getItems()[0]?.tooltip).toBe("updated");

    registry.unregister("a");
    expect(registry.getItems().map((item) => item.id)).toEqual(["b"]);
  });

  it("deduplicates and unregisters menu items", () => {
    const registry = new MenuRegistry();

    registry.register({ id: "file", path: "File", order: 10 });
    registry.register({ id: "edit", path: "Edit", order: 5 });
    registry.register({ id: "edit", path: "Edit", order: 1, shortcut: "Ctrl+E" });

    expect(registry.getItems().map((item) => item.id)).toEqual(["edit", "file"]);
    expect(registry.getItems()[0]?.shortcut).toBe("Ctrl+E");

    registry.unregister("edit");
    expect(registry.getItems().map((item) => item.id)).toEqual(["file"]);
  });
});

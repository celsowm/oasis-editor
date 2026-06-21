import { describe, expect, it } from "vitest";
import { Editor } from "@/core/Editor.js";
import type { OasisPlugin } from "@/core/plugin.js";

describe("Editor plugin integration", () => {
  it("executes a plugin command through public API", async () => {
    const timestampPlugin: OasisPlugin = {
      name: "Timestamp",
      commands: {
        insertTimestamp: {
          execute: () => "2026-06-01T00:00:00.000Z",
          refresh: () => ({ isEnabled: true }),
        },
      },
    };

    const editor = await Editor.create({ plugins: [timestampPlugin] });

    expect(editor.commands.canExecute("insertTimestamp")).toBe(true);
    expect(editor.commands.execute("insertTimestamp")).toBe(
      "2026-06-01T00:00:00.000Z",
    );

    await editor.destroy();
  });

  it("blocks command execution when refresh disables command", async () => {
    const plugin: OasisPlugin = {
      name: "Disabled",
      commands: {
        blocked: {
          execute: () => "never",
          refresh: () => ({ isEnabled: false }),
        },
      },
    };

    const editor = await Editor.create({ plugins: [plugin] });

    expect(editor.commands.canExecute("blocked")).toBe(false);
    expect(() => editor.commands.execute("blocked")).toThrow(
      "Command disabled: blocked",
    );

    await editor.destroy();
  });

  it("passes payload to command refresh before execution", async () => {
    const plugin: OasisPlugin = {
      name: "PayloadGuard",
      commands: {
        positive: {
          execute: (payload?: unknown) => payload,
          refresh: (payload?: unknown) => ({
            isEnabled: typeof payload === "number" && payload > 0,
          }),
        },
      },
    };

    const editor = await Editor.create({ plugins: [plugin] });

    expect(editor.commands.canExecute("positive", 2)).toBe(true);
    expect(editor.commands.canExecute("positive", -1)).toBe(false);
    expect(editor.commands.execute("positive", 2)).toBe(2);
    expect(() => editor.commands.execute("positive", -1)).toThrow(
      "Command disabled: positive",
    );

    await editor.destroy();
  });

  it("creates an editor with async plugins through the async factory", async () => {
    const events: string[] = [];
    const plugin: OasisPlugin = {
      name: "Async",
      commands: {
        ready: {
          execute: () => events.join(","),
        },
      },
      init: async () => {
        await Promise.resolve();
        events.push("init");
      },
      afterInit: async () => {
        await Promise.resolve();
        events.push("after");
      },
      destroy: async () => {
        await Promise.resolve();
        events.push("destroy");
      },
    };

    const editor = await Editor.create({ plugins: [plugin] });

    expect(editor.commands.execute("ready")).toBe("init,after");

    await editor.destroy();

    expect(events).toEqual(["init", "after", "destroy"]);
  });

  it("registers declarative plugin UI and cleans it up on destroy", async () => {
    const plugin: OasisPlugin = {
      name: "Assistant",
      commands: {
        toggleAssistant: {
          execute: (_payload, context) => {
            context?.ui.toggleSidePanel("assistant");
          },
        },
      },
      ui: {
        floatingActions: [
          {
            id: "assistant-button",
            command: "toggleAssistant",
            icon: "sparkles",
          },
        ],
        sidePanels: [
          {
            id: "assistant",
            title: "Assistant",
            render: () => "Assistant panel",
          },
        ],
      },
    };

    const editor = await Editor.create({ plugins: [plugin] });

    expect(editor.ui.getSnapshot().floatingActions).toHaveLength(1);
    expect(editor.ui.getSnapshot().sidePanels).toHaveLength(1);

    editor.commands.execute("toggleAssistant");
    expect(editor.ui.getSnapshot().activeSidePanelId).toBe("assistant");

    await editor.destroy();

    expect(editor.ui.getSnapshot().floatingActions).toHaveLength(0);
    expect(editor.ui.getSnapshot().sidePanels).toHaveLength(0);
    expect(editor.ui.getSnapshot().activeSidePanelId).toBeNull();
  });

  it("supports dynamic plugin UI registration cleanup", async () => {
    const editor = await Editor.create();

    const cleanupPanel = editor.ui.registerSidePanel({
      id: "dynamic",
      title: "Dynamic",
      render: () => "Dynamic panel",
    });
    const cleanupAction = editor.ui.registerFloatingAction({
      id: "dynamic-action",
      command: "noop",
      icon: "sparkles",
    });

    expect(editor.ui.getSnapshot().sidePanels).toHaveLength(1);
    expect(editor.ui.getSnapshot().floatingActions).toHaveLength(1);

    cleanupPanel();
    cleanupAction();

    expect(editor.ui.getSnapshot().sidePanels).toHaveLength(0);
    expect(editor.ui.getSnapshot().floatingActions).toHaveLength(0);

    await editor.destroy();
  });

  // Plugins are no longer accepted by the constructor at the type level
  // (SynchronousEditorOptions has no `plugins`), so the former runtime-throw
  // test is obsolete — the precondition is now enforced at compile time (L1).
});

import { describe, expect, it } from "vitest";
import { Editor } from "../../../../src/core/Editor.js";
import type { OasisPlugin } from "../../../../src/core/plugin.js";

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

  it("rejects plugins passed to the constructor", () => {
    const plugin: OasisPlugin = {
      name: "Sync",
    };

    expect(() => new Editor({ plugins: [plugin] })).toThrow(
      "Editor plugins must be initialized with Editor.create(...)",
    );
  });
});

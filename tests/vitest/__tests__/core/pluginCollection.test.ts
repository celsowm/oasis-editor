import { describe, expect, it } from "vitest";
import { PluginCollection } from "../../../../src/core/plugins/PluginCollection.js";
import { CommandRegistry } from "../../../../src/core/commands/CommandRegistry.js";
import { PluginUiRegistry } from "../../../../src/core/plugins/PluginUiRegistry.js";
import type { OasisEditor, OasisPlugin } from "../../../../src/core/plugin.js";

function createEditorStub() {
  const commands = new CommandRegistry();
  const state = {} as OasisEditor["state"];
  return {
    state,
    commands,
    ui: new PluginUiRegistry(),
    on: () => () => {},
    once: () => () => {},
    off: () => {},
  } satisfies OasisEditor;
}

describe("PluginCollection", () => {
  it("initializes plugins in dependency order and destroys in reverse order", async () => {
    const events: string[] = [];
    const editor = createEditorStub();

    const base: OasisPlugin = {
      name: "Base",
      init: () => {
        events.push("init:base");
      },
      afterInit: () => {
        events.push("after:base");
      },
      destroy: () => {
        events.push("destroy:base");
      },
    };

    const feature: OasisPlugin = {
      name: "Feature",
      requires: ["Base"],
      init: () => {
        events.push("init:feature");
      },
      afterInit: () => {
        events.push("after:feature");
      },
      destroy: () => {
        events.push("destroy:feature");
      },
    };

    const plugins = new PluginCollection(editor, [feature, base]);
    await plugins.initializeAll();

    expect(events).toEqual([
      "init:base",
      "init:feature",
      "after:base",
      "after:feature",
    ]);

    await plugins.destroy();

    expect(events).toEqual([
      "init:base",
      "init:feature",
      "after:base",
      "after:feature",
      "destroy:feature",
      "destroy:base",
    ]);
  });

  it("throws on missing dependencies", () => {
    const editor = createEditorStub();

    expect(
      () =>
        new PluginCollection(editor, [
          {
            name: "Feature",
            requires: ["Missing"],
          },
        ]),
    ).toThrow("requires missing plugin 'Missing'");
  });

  it("throws on cyclic dependencies", () => {
    const editor = createEditorStub();
    const a: OasisPlugin = { name: "A", requires: ["B"] };
    const b: OasisPlugin = { name: "B", requires: ["A"] };

    expect(() => new PluginCollection(editor, [a, b])).toThrow(
      "Cyclic plugin dependency",
    );
  });

  it("deduplicates by plugin name", async () => {
    const editor = createEditorStub();
    const calls: string[] = [];
    const a1: OasisPlugin = {
      name: "A",
      init: () => {
        calls.push("a1");
      },
    };
    const a2: OasisPlugin = {
      name: "A",
      init: () => {
        calls.push("a2");
      },
    };

    const plugins = new PluginCollection(editor, [a1, a2]);
    await plugins.initializeAll();

    expect(calls).toEqual(["a1"]);
  });

  it("cleans up commands and initialized plugins when init fails", async () => {
    const editor = createEditorStub();
    const events: string[] = [];

    const ok: OasisPlugin = {
      name: "Ok",
      commands: {
        hello: {
          execute: () => "ok",
        },
      },
      init: () => {
        events.push("ok:init");
      },
      destroy: () => {
        events.push("ok:destroy");
      },
    };

    const boom: OasisPlugin = {
      name: "Boom",
      init: () => {
        throw new Error("boom");
      },
    };

    const plugins = new PluginCollection(editor, [ok, boom]);
    await expect(plugins.initializeAll()).rejects.toThrow("boom");
    expect(editor.commands.has("hello")).toBe(false);
    expect(events).toEqual(["ok:init", "ok:destroy"]);
  });

  it("awaits async init, afterInit, and destroy hooks", async () => {
    const events: string[] = [];
    const editor = createEditorStub();

    const plugin: OasisPlugin = {
      name: "Async",
      init: async () => {
        events.push("init:start");
        await Promise.resolve();
        events.push("init:end");
      },
      afterInit: async () => {
        events.push("after:start");
        await Promise.resolve();
        events.push("after:end");
      },
      destroy: async () => {
        events.push("destroy:start");
        await Promise.resolve();
        events.push("destroy:end");
      },
    };

    const plugins = new PluginCollection(editor, [plugin]);
    await plugins.initializeAll();
    await plugins.destroy();

    expect(events).toEqual([
      "init:start",
      "init:end",
      "after:start",
      "after:end",
      "destroy:start",
      "destroy:end",
    ]);
  });
});

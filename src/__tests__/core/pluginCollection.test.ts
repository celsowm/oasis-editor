import { describe, expect, it } from "vitest";
import { PluginCollection } from "../../core/plugins/PluginCollection.js";
import { CommandRegistry } from "../../core/commands/CommandRegistry.js";
import type { OasisEditor, OasisPlugin } from "../../core/plugin.js";

function createEditorStub() {
  const commands = new CommandRegistry();
  const state = {} as OasisEditor["state"];
  return {
    state,
    commands,
    registerCommand: commands.register.bind(commands),
    unregisterCommand: commands.unregister.bind(commands),
    execute: <TPayload = unknown, TResult = unknown>(name: string, payload?: TPayload): TResult => {
      const command = commands.get(name);
      if (!command) throw new Error(`Unknown command: ${name}`);
      return command.execute(payload) as TResult;
    },
    canExecute: (name: string) => {
      const command = commands.get(name);
      if (!command) return false;
      return command.refresh?.().isEnabled !== false;
    },
    on: () => () => {},
    once: () => () => {},
    off: () => {},
  } satisfies OasisEditor;
}

describe("PluginCollection", () => {
  it("initializes plugins in dependency order and destroys in reverse order", () => {
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

    expect(events).toEqual(["init:base", "init:feature", "after:base", "after:feature"]);

    plugins.destroy();

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

    expect(() =>
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

    expect(() => new PluginCollection(editor, [a, b])).toThrow("Cyclic plugin dependency");
  });

  it("deduplicates by plugin name", () => {
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

    new PluginCollection(editor, [a1, a2]);

    expect(calls).toEqual(["a1"]);
  });

  it("cleans up commands and initialized plugins when init fails", () => {
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

    expect(() => new PluginCollection(editor, [ok, boom])).toThrow("boom");
    expect(editor.commands.has("hello")).toBe(false);
    expect(events).toEqual(["ok:init", "ok:destroy"]);
  });
});

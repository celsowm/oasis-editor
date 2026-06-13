import { describe, expect, it, vi } from "vitest";
import { createOasisEditorClient } from "../../app/client/OasisEditorClient.js";
import { createInitialEditorState } from "../../core/editorState.js";
import { Editor } from "../../core/Editor.js";
import type { OasisPlugin } from "../../core/plugin.js";

describe("OasisEditorClient", () => {
  it("exposes commands, state, document and lifecycle events", async () => {
    const plugin: OasisPlugin = {
      name: "ClientApi",
      commands: {
        ping: {
          execute: (payload) => payload ?? "pong",
          refresh: () => ({ isEnabled: true, value: "ready" }),
        },
      },
    };
    const editor = await Editor.create({ plugins: [plugin] });
    const client = createOasisEditorClient();
    const state = createInitialEditorState();
    const onReady = vi.fn();
    const onChange = vi.fn();
    const dispose = vi.fn();

    client.connectHost({
      getRuntimeEditor: () => editor,
      getState: () => state,
      getDocument: () => state.document,
      setDocument: (document) => {
        state.document = document;
      },
    });
    client.setDispose(dispose);
    client.on("ready", onReady);
    client.on("change", onChange);

    client.resolveReady(editor);
    client.emit("change", state);

    await expect(client.ready).resolves.toBe(editor);
    expect(onReady).toHaveBeenCalledWith(editor);
    expect(onChange).toHaveBeenCalledWith(state);
    expect(client.commands.canExecute("ping")).toBe(true);
    expect(client.commands.execute("ping", "payload")).toBe("payload");
    expect(client.commands.state("ping")).toEqual({
      isEnabled: true,
      isActive: false,
      value: "ready",
    });
    expect(client.getState()).toBe(state);
    expect(client.getDocument()).toBe(state.document);

    client.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);

    await editor.destroy();
  });
});

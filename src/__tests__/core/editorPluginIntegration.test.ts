import { describe, expect, it } from "vitest";
import { Editor } from "../../core/Editor.js";
import type { OasisPlugin } from "../../core/plugin.js";

describe("Editor plugin integration", () => {
  it("executes a plugin command through public API", () => {
    const timestampPlugin: OasisPlugin = {
      name: "Timestamp",
      commands: {
        insertTimestamp: {
          execute: () => "2026-06-01T00:00:00.000Z",
          refresh: () => ({ isEnabled: true }),
        },
      },
    };

    const editor = new Editor({ plugins: [timestampPlugin] });

    expect(editor.canExecute("insertTimestamp")).toBe(true);
    expect(editor.execute("insertTimestamp")).toBe("2026-06-01T00:00:00.000Z");

    editor.destroy();
  });

  it("blocks command execution when refresh disables command", () => {
    const plugin: OasisPlugin = {
      name: "Disabled",
      commands: {
        blocked: {
          execute: () => "never",
          refresh: () => ({ isEnabled: false }),
        },
      },
    };

    const editor = new Editor({ plugins: [plugin] });

    expect(editor.canExecute("blocked")).toBe(false);
    expect(() => editor.execute("blocked")).toThrow("Command disabled: blocked");

    editor.destroy();
  });
});

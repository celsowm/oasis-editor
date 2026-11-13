import { describe, expect, it } from "vitest";
import {
  createActionCommandBuilder,
  createCommandBuilder,
} from "@/plugins/internal/essentialsCommandBuilders.js";
import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type { CommandState } from "@/core/plugin.js";

const enabled = (command: ReturnType<ReturnType<typeof createCommandBuilder>>) =>
  (command.refresh?.() as CommandState).isEnabled;

describe("essentials command builders", () => {
  it("lets the domain condition narrow the gate but not widen it", () => {
    const gate = (name: OasisBuiltinCommand): boolean => name !== "bold";
    const action = createActionCommandBuilder(gate);
    const command = createCommandBuilder(gate);

    // Read-only gate closed, domain says the action would apply: still off.
    const readOnlyAction = action(
      "bold",
      () => {},
      () => ({ isEnabled: true }),
    );
    expect(enabled(readOnlyAction)).toBe(false);

    // Gate open, domain refuses: off.
    const unavailable = action(
      "italic",
      () => {},
      () => ({ isEnabled: false }),
    );
    expect(enabled(unavailable)).toBe(false);

    // Both allow: on.
    const available = command("italic", () => true, () => ({ isEnabled: true }));
    expect(enabled(available)).toBe(true);

    // No domain condition: the gate decides.
    expect(enabled(command("bold", () => true))).toBe(false);
    expect(enabled(command("italic", () => true))).toBe(true);
  });

  it("keeps extra state fields untouched", () => {
    const action = createActionCommandBuilder(() => true);
    const toggle = action(
      "toggleTrackChanges",
      () => {},
      () => ({ isEnabled: true, isActive: true, value: "x" }),
    );
    expect(toggle.refresh?.()).toMatchObject({
      isEnabled: true,
      isActive: true,
      value: "x",
    });
  });
});

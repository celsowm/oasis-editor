import { describe, it, expect } from "vitest";
import { CommandRegistry } from "@/core/commands/CommandRegistry.js";
import { createEditorCommandBus } from "@/core/commands/CommandBus.js";
import type {
  OasisCommandContext,
  OasisEditor,
} from "@/core/plugin.js";

// Regression for L2: the command bus must evaluate command state through the
// registry so `refresh` receives the same OasisCommandContext that
// `execute`/`canExecute` get. Calling `refresh` directly from the bus dropped
// the context and diverged from CommandRegistry.state.
describe("createEditorCommandBus", () => {
  function makeEditor(registry: CommandRegistry): OasisEditor {
    return { commands: registry } as unknown as OasisEditor;
  }

  it("passes the command context to refresh when reading state", () => {
    const registry = new CommandRegistry();
    const context = { marker: "ctx" } as unknown as OasisCommandContext;
    registry.setContextProvider(() => context);

    let seenContext: OasisCommandContext | undefined;
    registry.register("probe", {
      execute: () => undefined,
      refresh: (_payload, ctx) => {
        seenContext = ctx;
        return { isEnabled: true, isActive: ctx === context };
      },
    });

    const bus = createEditorCommandBus(makeEditor(registry));
    const state = bus.state("probe");

    expect(seenContext).toBe(context);
    expect(state.isActive).toBe(true);
  });

  it("forwards the payload to refresh when reading state", () => {
    const registry = new CommandRegistry();
    registry.register("withPayload", {
      execute: () => undefined,
      refresh: (payload) => ({ isEnabled: true, value: payload }),
    });

    const bus = createEditorCommandBus(makeEditor(registry));
    const state = bus.state({ name: "withPayload", payload: 42 });

    expect(state.value).toBe(42);
  });

  it("falls back to has() for commands without refresh", () => {
    const registry = new CommandRegistry();
    registry.register("noRefresh", { execute: () => undefined });

    const bus = createEditorCommandBus(makeEditor(registry));

    expect(bus.state("noRefresh")).toEqual({ isEnabled: true });
    expect(bus.state("missing")).toEqual({ isEnabled: false });
  });
});

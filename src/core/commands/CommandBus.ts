import type { CommandState, OasisEditor } from "@/core/plugin.js";
import type { CommandRef } from "./CommandRef.js";
import { resolveCommandRef } from "./CommandRef.js";

export interface CommandBus<TState = CommandState> {
  execute(command: CommandRef, payloadOverride?: unknown): unknown;
  canExecute(command: CommandRef, payloadOverride?: unknown): boolean;
  state(command: CommandRef): TState;
}

export function createEditorCommandBus(editor: OasisEditor): CommandBus {
  return {
    execute(command, payloadOverride) {
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.commands.execute(resolved.name, resolved.payload);
    },
    canExecute(command, payloadOverride) {
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.commands.canExecute(resolved.name, resolved.payload);
    },
    state(command) {
      const resolved = resolveCommandRef(command);
      // Delegate to the registry so `refresh` receives the command context the
      // same way `execute`/`canExecute` do — calling `refresh` here directly
      // would drop the context and diverge from CommandRegistry.state (L2).
      return editor.commands.state(resolved.name, resolved.payload);
    },
  };
}

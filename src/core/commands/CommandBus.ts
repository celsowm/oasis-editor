import type { CommandState, OasisEditor } from "../plugin.js";
import type { CommandRef } from "./CommandRef.js";
import { commandRefName, resolveCommandRef } from "./CommandRef.js";

export interface CommandBus<TState = CommandState> {
  execute(command: CommandRef, payloadOverride?: unknown): unknown;
  canExecute(command: CommandRef, payloadOverride?: unknown): boolean;
  state(command: CommandRef): TState;
}

export function createEditorCommandBus(editor: OasisEditor): CommandBus {
  return {
    execute(command, payloadOverride) {
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.execute(resolved.name, resolved.payload);
    },
    canExecute(command, payloadOverride) {
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.canExecute(resolved.name, resolved.payload);
    },
    state(command) {
      const name = commandRefName(command);
      const registered = editor.commands.get(name);
      return registered?.refresh?.() ?? { isEnabled: editor.commands.has(name) };
    },
  };
}

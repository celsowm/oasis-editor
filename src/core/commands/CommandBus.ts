import type { CommandState, OasisEditor } from "../plugin.js";
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
      return editor.execute(resolved.name, resolved.payload);
    },
    canExecute(command, payloadOverride) {
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.canExecute(resolved.name, resolved.payload);
    },
    state(command) {
      const resolved = resolveCommandRef(command);
      const registered = editor.commands.get(resolved.name);
      return (
        registered?.refresh?.(resolved.payload) ?? {
          isEnabled: editor.commands.has(resolved.name),
        }
      );
    },
  };
}

import type { CommandState, OasisEditor } from "@/core/plugin.js";
import type { CommandRef } from "./CommandRef.js";
import { resolveCommandRef } from "./CommandRef.js";

/**
 * Untyped command bus that accepts {@link CommandRef} references. Used
 * internally when command names are known only at runtime.
 * @typeParam TState - The command state type.
 */
export interface CommandBus<TState = CommandState> {
  /**
   * Executes a command by reference, with an optional payload override.
   * @param command - The command reference.
   * @param payloadOverride - Optional payload override.
   * @returns The command's result.
   */
  execute(command: CommandRef, payloadOverride?: unknown): unknown;
  /**
   * @param command - The command reference.
   * @param payloadOverride - Optional payload override.
   * @returns Whether the command can execute.
   */
  canExecute(command: CommandRef, payloadOverride?: unknown): boolean;
  /**
   * @param command - The command reference.
   * @returns The command's reactive state.
   */
  state(command: CommandRef): TState;
}

/**
 * Creates a command bus backed by the editor's command registry.
 * The bus resolves command references before delegating to the registry.
 * @param editor - The editor instance.
 * @returns A new CommandBus.
 */
export function createEditorCommandBus(editor: OasisEditor): CommandBus {
  return {
    execute(command, payloadOverride): unknown {
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.commands.execute(resolved.name, resolved.payload);
    },
    canExecute(command, payloadOverride): boolean {
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.commands.canExecute(resolved.name, resolved.payload);
    },
    state(command): CommandState {
      const resolved = resolveCommandRef(command);
      return editor.commands.state(resolved.name, resolved.payload);
    },
  };
}

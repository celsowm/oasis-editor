import type { CommandState, OasisCommand } from "@/core/plugin.js";
import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";

export type CommandEnabledResolver = (
  commandName: OasisBuiltinCommand,
) => boolean;
export type CommandBuilder = (
  name: OasisBuiltinCommand,
  execute: () => boolean,
  state?: () => Partial<CommandState>,
) => OasisCommand;
export type ValueCommandBuilder = (
  name: OasisBuiltinCommand,
  execute: (payload?: unknown) => boolean,
  value: () => unknown,
) => OasisCommand;
export type ActionCommandBuilder = (
  name: OasisBuiltinCommand,
  execute: (payload?: unknown) => void,
  state?: () => Partial<CommandState>,
) => OasisCommand;

export function createCommandBuilder(isCommandEnabled: CommandEnabledResolver) {
  return (
    name: OasisBuiltinCommand,
    execute: () => boolean,
    state?: () => Partial<CommandState>,
  ): OasisCommand => ({
    execute,
    refresh: (): CommandState => ({
      isEnabled: isCommandEnabled(name),
      ...state?.(),
    }),
  });
}

export function createValueCommandBuilder(
  isCommandEnabled: CommandEnabledResolver,
) {
  return (
    name: OasisBuiltinCommand,
    execute: (payload?: unknown) => boolean,
    value: () => unknown,
  ): OasisCommand => ({
    execute,
    refresh: (): CommandState => ({
      isEnabled: isCommandEnabled(name),
      value: value(),
    }),
  });
}

export function createActionCommandBuilder(
  isCommandEnabled: CommandEnabledResolver,
) {
  return (
    name: OasisBuiltinCommand,
    execute: (payload?: unknown) => void,
    state?: () => Partial<CommandState>,
  ): OasisCommand => ({
    execute: (payload?: unknown): boolean => {
      execute(payload);
      return true;
    },
    refresh: (): CommandState => ({
      isEnabled: isCommandEnabled(name),
      ...state?.(),
    }),
  });
}

export function numOrNull(payload: unknown): number | null {
  return payload != null && payload !== "" ? Number(payload) : null;
}

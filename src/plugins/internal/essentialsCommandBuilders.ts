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
    refresh: (): CommandState => {
      const extra = state?.() ?? {};
      // A command's own condition (can it apply here?) can only narrow the
      // gate, never widen it: a read-only document must stay read-only even
      // when the domain says the action is possible.
      return {
        ...extra,
        isEnabled: isCommandEnabled(name) && (extra.isEnabled ?? true),
      };
    },
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
    refresh: (): CommandState => {
      const extra = state?.() ?? {};
      // See createCommandBuilder: the domain condition narrows the gate only.
      return {
        ...extra,
        isEnabled: isCommandEnabled(name) && (extra.isEnabled ?? true),
      };
    },
  });
}

export function boolOrNull(payload: unknown): boolean | null {
  if (payload === null || payload === undefined || payload === "") return null;
  return payload === true || payload === "true" || payload === 1;
}

export function strOrNull(payload: unknown): string | null {
  if (payload === null || payload === undefined || payload === "") return null;
  return typeof payload === "string" ? payload : String(payload);
}

export function numOrNull(payload: unknown): number | null {
  return payload != null && payload !== "" ? Number(payload) : null;
}

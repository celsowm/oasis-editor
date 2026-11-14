/**
 * Repeat-last-command tracking (Word's F4 / Quick Access Repeat). Records the
 * last command executed through the command bus, excluding pure navigation,
 * chrome and history commands, and re-executes it — payload included — on
 * demand. Kept framework-free of command-registry internals: the registry
 * only reports executions via its `onExecuted` hook.
 */

/** Commands that must never become the repeat target. */
const REPEAT_DENYLIST: ReadonlySet<string> = new Set([
  "undo",
  "redo",
  "repeatLastAction",
  "find",
  "replace",
  "replaceAll",
  "print",
  "newDocument",
  "saveDocument",
  "insertHtml",
  "insertImageFromFile",
  "openSymbolDialog",
  "openEquationDialog",
  "openCommandSearch",
  "importDocument",
  "exportDocx",
  "exportPdf",
]);

export interface RepeatTracking {
  /** Last recordable command, or null when nothing repeatable happened. */
  lastCommand: () => string | null;
  /** Record a bus execution; called from the registry's onExecuted hook. */
  record: (command: string, payload?: unknown) => void;
  /** Whether the last command can be re-executed right now. */
  canExecute: () => boolean;
  /** Re-execute the last command (no-op when there is nothing to repeat). */
  execute: () => void;
}

export function isRepeatableCommand(command: string): boolean {
  return !REPEAT_DENYLIST.has(command);
}

export function createRepeatTracking(
  executeCommand: (command: string, payload?: unknown) => unknown,
  canExecuteCommand: (command: string, payload?: unknown) => boolean,
): RepeatTracking {
  let last: { command: string; payload?: unknown } | null = null;
  return {
    lastCommand: (): string | null => last?.command ?? null,
    record: (command: string, payload?: unknown): void => {
      if (!isRepeatableCommand(command)) return;
      last = { command, payload };
    },
    canExecute: (): boolean =>
      last !== null &&
      safe((): boolean => canExecuteCommand(last!.command, last!.payload)),
    execute: (): void => {
      if (!last) return;
      executeCommand(last.command, last.payload);
    },
  };
}

function safe(run: () => boolean): boolean {
  try {
    return run();
  } catch {
    return false;
  }
}

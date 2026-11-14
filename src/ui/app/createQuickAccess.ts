import { createEffect, createSignal } from "solid-js";

export interface QuickAccessCatalogEntry {
  /** Built-in command name dispatched through the command bus. */
  command: string;
  /** Lucide icon name used on the strip and in the customize menu. */
  icon: string;
}

const STORAGE_KEY = "oasis-quick-access-v1";

/** The default strip: the three actions every editor needs in reach. */
const DEFAULT_COMMANDS = ["saveDocument", "undo", "redo", "repeatLastAction"];

function readStored(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_COMMANDS];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_COMMANDS];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [...DEFAULT_COMMANDS];
  }
}

function writeStored(commands: string[]): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(commands));
  } catch {
    // Persistence is best-effort; the toggle still works for the session.
  }
}

/**
 * Quick Access Toolbar state: which of the curated commands is visible on the
 * strip. Persisted to localStorage (`oasis-quick-access-v1`) so the layout
 * survives reloads; unknown commands from a newer version are dropped.
 */
export function createQuickAccess(
  catalog: readonly QuickAccessCatalogEntry[],
): {
  catalog: readonly QuickAccessCatalogEntry[];
  visible: () => string[];
  isShown: (command: string) => boolean;
  toggle: (command: string) => void;
} {
  const known = new Set(catalog.map((entry) => entry.command));
  const stored = readStored().filter((command): boolean => known.has(command));
  // Additive defaults: newly shipped defaults surface for existing users too;
  // the user can then opt back out via the customize menu.
  const initial =
    stored.length > 0
      ? [...stored, ...DEFAULT_COMMANDS.filter(
          (command): boolean =>
            known.has(command) && !stored.includes(command),
        )]
      : [...DEFAULT_COMMANDS];
  const [visible, setVisible] = createSignal<string[]>(initial);
  createEffect((): void => {
    writeStored(visible());
  });
  return {
    catalog,
    visible,
    isShown: (command: string): boolean => visible().includes(command),
    toggle: (command: string): void => {
      if (!known.has(command)) return;
      setVisible((current): string[] =>
        current.includes(command)
          ? current.filter((value): boolean => value !== command)
          : [...current, command],
      );
    },
  };
}

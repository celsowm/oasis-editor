const DEBUG_STORAGE_KEY = "oasis-editor:debug";

type LogLevel = "debug" | "info" | "warn" | "error";

interface DebugControl {
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
}

declare global {
  interface Window {
    __OASIS_EDITOR_DEBUG__?: boolean;
    __OASIS_EDITOR_DEBUG_CONTROL__?: DebugControl;
  }
}

function readStorageFlag(): boolean {
  try {
    return globalThis.localStorage?.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readStorageOverride(): boolean | null {
  try {
    const value = globalThis.localStorage?.getItem(DEBUG_STORAGE_KEY);
    if (value === "1") {
      return true;
    }
    if (value === "0") {
      return false;
    }
    return null;
  } catch {
    return null;
  }
}

function isLocalhostLike(): boolean {
  const hostname = globalThis.window?.location?.hostname ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isEditorDebugEnabled(): boolean {
  // Local development must always keep debug logs on.
  if (isLocalhostLike()) {
    return true;
  }

  if (globalThis.window?.__OASIS_EDITOR_DEBUG__ === true) {
    return true;
  }

  if (globalThis.window?.__OASIS_EDITOR_DEBUG__ === false) {
    return false;
  }

  const storageOverride = readStorageOverride();
  if (storageOverride !== null) {
    return storageOverride;
  }

  return readStorageFlag();
}

export function setEditorDebugEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      globalThis.localStorage?.setItem(DEBUG_STORAGE_KEY, "1");
    } else {
      globalThis.localStorage?.setItem(DEBUG_STORAGE_KEY, "0");
    }
  } catch {
    // ignore storage errors
  }

  if (globalThis.window) {
    globalThis.window.__OASIS_EDITOR_DEBUG__ = enabled;
  }
}

export function installEditorDebugControl(): void {
  if (!globalThis.window) {
    return;
  }

  globalThis.window.__OASIS_EDITOR_DEBUG_CONTROL__ = {
    enable: () => setEditorDebugEnabled(true),
    disable: () => setEditorDebugEnabled(false),
    isEnabled: () => isEditorDebugEnabled(),
  };
}

function unwrapForLogging(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "object") {
    if (typeof value === "function") {
      return `[Function ${(value as { name?: string }).name ?? "anonymous"}]`;
    }
    return value;
  }
  if (seen.has(value as object)) {
    return "[Circular]";
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((entry) => unwrapForLogging(entry, seen));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value instanceof Map) {
    return Array.from(value.entries()).map(([k, v]) => [
      unwrapForLogging(k, seen),
      unwrapForLogging(v, seen),
    ]);
  }
  if (value instanceof Set) {
    return Array.from(value.values()).map((entry) => unwrapForLogging(entry, seen));
  }

  // Plain object or Solid proxy - copy own keys to a fresh object so the
  // browser console renders the values inline instead of "Proxy(Object)".
  const plain: Record<string, unknown> = {};
  for (const key of Object.keys(value as object)) {
    plain[key] = unwrapForLogging((value as Record<string, unknown>)[key], seen);
  }
  return plain;
}

function formatInlineSummary(payload: unknown): string | null {
  try {
    const json = JSON.stringify(payload);
    if (!json) {
      return null;
    }
    return json.length > 240 ? `${json.slice(0, 237)}...` : json;
  } catch {
    return null;
  }
}

export type EditorLogger = ReturnType<typeof createEditorLogger>;

export function createEditorLogger(scope: string) {
  const write = (level: LogLevel, message: string, payload?: unknown) => {
    if (!isEditorDebugEnabled() && level === "debug") {
      return;
    }

    const prefix = `[oasis-editor:${scope}] ${message}`;
    const debugSink = isLocalhostLike() ? console.info : console.debug;
    const sink =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "info"
            ? console.info
            : debugSink;

    if (payload === undefined) {
      sink(prefix);
      return;
    }

    const unwrapped = unwrapForLogging(payload);
    const summary = formatInlineSummary(unwrapped);
    if (summary !== null) {
      sink(`${prefix} ${summary}`, unwrapped);
      return;
    }
    sink(prefix, unwrapped);
  };

  return {
    debug: (message: string, payload?: unknown) => write("debug", message, payload),
    info: (message: string, payload?: unknown) => write("info", message, payload),
    warn: (message: string, payload?: unknown) => write("warn", message, payload),
    error: (message: string, payload?: unknown) => write("error", message, payload),
  };
}

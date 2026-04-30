const DEBUG_STORAGE_KEY = "oasis-editor-2:debug";

type LogLevel = "debug" | "info" | "warn" | "error";

interface DebugControl {
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
}

declare global {
  interface Window {
    __OASIS_EDITOR2_DEBUG__?: boolean;
    __OASIS_EDITOR2_DEBUG_CONTROL__?: DebugControl;
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

export function isEditor2DebugEnabled(): boolean {
  // Local development must always keep debug logs on.
  if (isLocalhostLike()) {
    return true;
  }

  if (globalThis.window?.__OASIS_EDITOR2_DEBUG__ === true) {
    return true;
  }

  if (globalThis.window?.__OASIS_EDITOR2_DEBUG__ === false) {
    return false;
  }

  const storageOverride = readStorageOverride();
  if (storageOverride !== null) {
    return storageOverride;
  }

  return readStorageFlag();
}

export function setEditor2DebugEnabled(enabled: boolean): void {
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
    globalThis.window.__OASIS_EDITOR2_DEBUG__ = enabled;
  }
}

export function installEditor2DebugControl(): void {
  if (!globalThis.window) {
    return;
  }

  globalThis.window.__OASIS_EDITOR2_DEBUG_CONTROL__ = {
    enable: () => setEditor2DebugEnabled(true),
    disable: () => setEditor2DebugEnabled(false),
    isEnabled: () => isEditor2DebugEnabled(),
  };
}

export function createEditor2Logger(scope: string) {
  const write = (level: LogLevel, message: string, payload?: unknown) => {
    if (!isEditor2DebugEnabled() && level === "debug") {
      return;
    }

    const prefix = `[oasis-editor-2:${scope}] ${message}`;
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

    sink(prefix, payload);
  };

  return {
    debug: (message: string, payload?: unknown) => write("debug", message, payload),
    info: (message: string, payload?: unknown) => write("info", message, payload),
    warn: (message: string, payload?: unknown) => write("warn", message, payload),
    error: (message: string, payload?: unknown) => write("error", message, payload),
  };
}

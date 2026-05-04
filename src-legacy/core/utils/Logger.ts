import { ILogger } from "./ILogger.js";

let debugEnabled: boolean | undefined;

export function isDebugEnabled(): boolean {
  if (debugEnabled !== undefined) return debugEnabled;
  if (typeof window === "undefined") return false;

  let result = false;
  if (window.OASIS_DEBUG) {
    result = true;
  } else {
    try {
      if (window.localStorage?.getItem("oasis-debug") === "1") result = true;
    } catch {
      // Ignore storage access errors.
    }

    if (!result) {
      const search = window.location?.search ?? "";
      if (search.includes("debug=1") || search.includes("oasisDebug=1")) result = true;
    }

    if (!result) {
      const hostname = window.location?.hostname ?? "";
      if (hostname === "localhost" || hostname === "127.0.0.1") result = true;
    }
  }

  debugEnabled = result;
  return result;
}

export const Logger: ILogger = {
  debug: (...args: unknown[]) => { if (isDebugEnabled()) console.log(...args); },
  log: (...args: unknown[]) => { if (isDebugEnabled()) console.log(...args); },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  trace: (message: string) => { if (isDebugEnabled()) console.trace(message); },
};

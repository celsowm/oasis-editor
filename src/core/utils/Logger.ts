import { ILogger } from "./ILogger.js";

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  if (window.OASIS_DEBUG) return true;

  try {
    if (window.localStorage?.getItem("oasis-debug") === "1") return true;
  } catch {
    // Ignore storage access errors.
  }

  const search = window.location?.search ?? "";
  if (search.includes("debug=1") || search.includes("oasisDebug=1")) return true;

  const hostname = window.location?.hostname ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export const Logger: ILogger = {
  debug: (...args: unknown[]) => { if (isDebugEnabled()) console.log(...args); },
  log: (...args: unknown[]) => { if (isDebugEnabled()) console.log(...args); },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  trace: (message: string) => { if (isDebugEnabled()) console.trace(message); },
};

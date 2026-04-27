import { ILogger } from "./ILogger.js";

// Global debug flag — declared via Window interface augmentation (see src/types/global.d.ts)
const DEBUG = typeof window !== 'undefined' && window.OASIS_DEBUG;

export const Logger: ILogger = {
  debug: (...args: unknown[]) => { if (DEBUG) console.log(...args); },
  log: (...args: unknown[]) => { if (DEBUG) console.log(...args); },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  trace: (message: string) => { if (DEBUG) console.trace(message); },
};

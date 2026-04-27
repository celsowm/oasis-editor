const DEBUG = typeof window !== 'undefined' && (window as any).OASIS_DEBUG;

export const Logger = {
  debug: (...args: any[]) => DEBUG && console.log(...args),
  log: (...args: any[]) => DEBUG && console.log(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
  trace: (message: string) => DEBUG && console.trace(message),
};

export function scheduleAnimationFrame(callback: () => void): number {
  if (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function"
  ) {
    return window.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(callback, 16) as unknown as number;
}

export function cancelScheduledAnimationFrame(handle: number): void {
  if (
    typeof window !== "undefined" &&
    typeof window.cancelAnimationFrame === "function"
  ) {
    window.cancelAnimationFrame(handle);
    return;
  }
  globalThis.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
}

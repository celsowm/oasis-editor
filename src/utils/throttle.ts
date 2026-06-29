/**
 * Debounce: delays execution until `delay` ms have passed since the last call.
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout((): void => {
      timer = null;
      fn(...args);
    }, delay);
  };
}

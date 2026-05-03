/**
 * Debounce: delays execution until `delay` ms have passed since the last call.
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: any = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
}

/**
 * Rounds `value` to `decimals` fractional digits. Equivalent to the
 * `Math.round(value * 10 ** decimals) / 10 ** decimals` idiom that was repeated
 * across the import, UI and metrics layers (audit #27); results are
 * byte-identical to those inline expressions.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

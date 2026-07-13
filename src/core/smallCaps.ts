/** True when Word small-caps formatting must uppercase and reduce this glyph. */
export function isLowercaseSmallCapsChar(char: string): boolean {
  return char.toUpperCase() !== char;
}

/** Applies the display-only casing used by w:caps and w:smallCaps. */
export function resolveRenderedTextChar(
  char: string,
  styles: { allCaps?: boolean; smallCaps?: boolean } | undefined,
): string {
  return styles?.allCaps || styles?.smallCaps ? char.toUpperCase() : char;
}

import { normalizeFamily } from "@/export/pdf/fonts/officeFontAssets.js";
import { isPreciseFontModeEnabled } from "./preciseFontMode.js";
import type { SfntFontProgram } from "./sfnt/SfntFontProgram.js";

/**
 * Real, locally-installed font programs parsed for "precise font mode". When the
 * document's requested family is genuinely installed (discovered via the Local
 * Font Access API) and precise mode is on, the layout engine measures advances
 * and line heights from these real faces instead of the bundled metric-compatible
 * substitute. This is what lets the canvas match Word for fonts whose substitute
 * is NOT actually metric-compatible (e.g. Aptos, which is approximated by Carlito
 * ≈ Calibri). It trades cross-machine/PDF determinism for on-screen parity, so it
 * only ever applies behind the opt-in precise-mode flag.
 *
 * The painter ({@link resolveCanvasFontFamily}) and the metrics provider both key
 * off {@link hasPreciseFont} / {@link getPreciseFontProgram} so that whatever is
 * painted is also what was measured — they never diverge.
 */
const registry = new Map<string, SfntFontProgram>();
const familiesWithPreciseFont = new Set<string>();

function faceKey(family: string, bold: boolean, italic: boolean): string {
  return `${normalizeFamily(family).toLowerCase()}|${bold ? "b" : ""}${italic ? "i" : ""}`;
}

export function registerPreciseFont(
  family: string,
  bold: boolean,
  italic: boolean,
  program: SfntFontProgram,
): void {
  registry.set(faceKey(family, bold, italic), program);
  familiesWithPreciseFont.add(normalizeFamily(family).toLowerCase());
}

export function clearPreciseFonts(): void {
  registry.clear();
  familiesWithPreciseFont.clear();
}

/** Whether any real face is loaded for the family (ignores the mode flag). */
export function hasPreciseFont(family: string | null | undefined): boolean {
  if (familiesWithPreciseFont.size === 0) return false;
  return familiesWithPreciseFont.has(normalizeFamily(family).toLowerCase());
}

/** Whether a specific face has already been registered (used to skip reloads). */
export function hasPreciseFontFace(
  family: string,
  bold: boolean,
  italic: boolean,
): boolean {
  return registry.has(faceKey(family, bold, italic));
}

/**
 * The real font program for the requested face when precise mode is active and it
 * was loaded, else `null`. Falls back to the regular face of the same family when
 * the exact bold/italic face is not installed, so a paragraph never mixes real
 * and substitute metrics within one family. Returns `null` when precise mode is
 * off so callers transparently revert to the bundled substitute.
 */
export function getPreciseFontProgram(
  family: string | null | undefined,
  bold: boolean,
  italic: boolean,
): SfntFontProgram | null {
  if (!isPreciseFontModeEnabled() || registry.size === 0) {
    return null;
  }
  const resolved = family ?? "";
  return (
    registry.get(faceKey(resolved, bold, italic)) ??
    registry.get(faceKey(resolved, false, false)) ??
    null
  );
}

import { createSignal } from "solid-js";
import { normalizeFamily } from "../../export/pdf/fonts/officeFontAssets.js";

/**
 * Opt-in "precise font mode". When enabled and the document's requested family
 * is actually installed locally (discovered via the Local Font Access API), the
 * canvas painter renders the real font instead of the bundled metric-compatible
 * substitute. Because the substitutes are metric-compatible, advances and line
 * heights are identical, so this only sharpens on-screen glyphs — layout never
 * shifts.
 *
 * The painter reads {@link isPreciseFontModeEnabled} / {@link isLocalFontFamilyAvailable}
 * synchronously during paint, so those are plain (non-reactive) reads. A
 * separate Solid signal, {@link preciseFontModeVersion}, lets UI subscribe and
 * trigger a repaint whenever the mode or the available-font set changes.
 */
let enabled = false;
let availableLocalFamilies = new Set<string>();

const [version, setVersion] = createSignal(0);

/** Reactive accessor that bumps whenever precise-mode state changes. */
export const preciseFontModeVersion = version;

export function isPreciseFontModeEnabled(): boolean {
  return enabled;
}

export function setPreciseFontModeEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  setVersion((current) => current + 1);
}

export function setAvailableLocalFontFamilies(
  families: Iterable<string>,
): void {
  availableLocalFamilies = new Set(
    Array.from(families, (family) => family.trim().toLowerCase()).filter(
      Boolean,
    ),
  );
  setVersion((current) => current + 1);
}

/** True when the given (document-requested) family is installed locally. */
export function isLocalFontFamilyAvailable(
  fontFamily: string | null | undefined,
): boolean {
  if (availableLocalFamilies.size === 0) return false;
  return availableLocalFamilies.has(normalizeFamily(fontFamily).toLowerCase());
}

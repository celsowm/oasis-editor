import {
  isPreciseFontModeEnabled,
  setAvailableLocalFontFamilies,
  setPreciseFontModeEnabled,
} from "../../text/fonts/preciseFontMode.js";
import {
  getPreciseFontPreference,
  setPreciseFontPreference,
} from "../../app/services/userPreferences.js";

/**
 * Single entry point for the Local Font Access API (`queryLocalFonts`). Owns one
 * cached probe shared by the toolbar font picker and precise font mode, plus the
 * orchestration that turns precise mode on/off and re-applies it silently on
 * return visits.
 */
interface LocalFont {
  family?: string;
  fullName?: string;
}

function getQueryLocalFonts(): (() => Promise<LocalFont[]>) | undefined {
  return (
    globalThis as {
      queryLocalFonts?: () => Promise<LocalFont[]>;
    }
  ).queryLocalFonts;
}

let cachedFamilies: string[] | null = null;
let inFlight: Promise<string[]> | null = null;

export function isLocalFontAccessSupported(): boolean {
  return typeof getQueryLocalFonts() === "function";
}

/**
 * Queries the installed font families (deduped, sorted). The first call may
 * trigger the browser permission prompt; results are cached and pushed into the
 * precise-font-mode availability set. Returns `[]` when unsupported or denied.
 */
export function probeLocalFontFamilies(): Promise<string[]> {
  if (cachedFamilies) return Promise.resolve(cachedFamilies);
  if (inFlight) return inFlight;

  const queryLocalFonts = getQueryLocalFonts();
  if (!queryLocalFonts) return Promise.resolve([]);

  inFlight = (async () => {
    try {
      const fonts = await queryLocalFonts();
      const families = Array.from(
        new Set(
          fonts
            .map((font) => font.family?.trim() || font.fullName?.trim() || "")
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));
      cachedFamilies = families;
      setAvailableLocalFontFamilies(families);
      return families;
    } catch {
      // Permission denied or query failed — fall back to substitutes.
      return [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Whether the browser already granted local-fonts permission (never prompts). */
export async function isLocalFontPermissionGranted(): Promise<boolean> {
  try {
    const permissions = (
      navigator as {
        permissions?: {
          query: (opts: { name: PermissionName }) => Promise<{ state: string }>;
        };
      }
    ).permissions;
    if (!permissions?.query) return false;
    const status = await permissions.query({
      name: "local-fonts" as PermissionName,
    });
    return status.state === "granted";
  } catch {
    return false;
  }
}

/**
 * Enable precise font mode in response to an explicit user gesture (welcome
 * dialog / menu). Probes installed fonts — prompting for permission if needed —
 * and only enables when at least one family is readable. Persists the result.
 * Returns whether precise mode is now active.
 */
export async function enablePreciseFontMode(): Promise<boolean> {
  const families = await probeLocalFontFamilies();
  const ok = families.length > 0;
  setPreciseFontModeEnabled(ok);
  setPreciseFontPreference(ok);
  return ok;
}

/** Disable precise font mode and persist the preference. */
export function disablePreciseFontMode(): void {
  setPreciseFontModeEnabled(false);
  setPreciseFontPreference(false);
}

/** Toggle precise font mode; enabling prompts/probes, disabling is immediate. */
export async function togglePreciseFontMode(): Promise<boolean> {
  if (isPreciseFontModeEnabled()) {
    disablePreciseFontMode();
    return false;
  }
  return enablePreciseFontMode();
}

/**
 * Re-apply a previously stored "on" preference on startup without ever showing
 * a permission prompt: only proceeds when the browser already granted access.
 */
export async function applyStoredPreciseFontPreference(): Promise<void> {
  if (!getPreciseFontPreference()) return;
  if (!isLocalFontAccessSupported()) return;
  if (!(await isLocalFontPermissionGranted())) return;
  const families = await probeLocalFontFamilies();
  if (families.length > 0) setPreciseFontModeEnabled(true);
}

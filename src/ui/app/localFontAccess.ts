import {
  isPreciseFontModeEnabled,
  setAvailableLocalFontFamilies,
  setPreciseFontModeEnabled,
} from "@/text/fonts/preciseFontMode.js";
import {
  hasPreciseFontFace,
  registerPreciseFont,
} from "@/text/fonts/preciseFontMetrics.js";
import { SfntFontProgram } from "@/text/fonts/sfnt/SfntFontProgram.js";
import { normalizeFamily } from "@/export/pdf/fonts/officeFontAssets.js";
import {
  getPreciseFontPreference,
  setPreciseFontPreference,
} from "@/app/services/userPreferences.js";
import { createEditorLogger } from "@/utils/logger.js";

const fontLogger = createEditorLogger("fonts");

/**
 * Single entry point for the Local Font Access API (`queryLocalFonts`). Owns one
 * cached probe shared by the toolbar font picker and precise font mode, plus the
 * orchestration that turns precise mode on/off and re-applies it silently on
 * return visits.
 */
interface LocalFont {
  family?: string;
  fullName?: string;
  style?: string;
  postscriptName?: string;
  blob?: () => Promise<Blob>;
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

function classifyFaceStyle(font: LocalFont): {
  bold: boolean;
  italic: boolean;
} {
  const descriptor = `${font.style ?? ""} ${font.fullName ?? ""}`.toLowerCase();
  return {
    bold: /\bbold\b/.test(descriptor),
    italic: /\b(italic|oblique)\b/.test(descriptor),
  };
}

/**
 * Picks the program for the exact face the {@link LocalFont} describes. A plain
 * sfnt yields a single program; a TrueType Collection (`ttcf`) yields one per
 * sub-font, so we match by PostScript name first (most reliable), then by the
 * macStyle bold/italic bits, and only then fall back to the first face.
 */
function selectFaceProgram(
  bytes: Uint8Array,
  font: LocalFont,
): SfntFontProgram {
  const programs = SfntFontProgram.parseCollection(bytes);
  if (programs.length === 1) {
    return programs[0]!;
  }
  const targetPs = (font.postscriptName ?? "").trim().toLowerCase();
  if (targetPs) {
    const byName = programs.find(
      (program) => program.metadata.postscriptName.toLowerCase() === targetPs,
    );
    if (byName) return byName;
  }
  const { bold, italic } = classifyFaceStyle(font);
  const byStyle = programs.find(
    (program) =>
      program.metadata.macStyleBold === bold &&
      program.metadata.macStyleItalic === italic,
  );
  return byStyle ?? programs[0]!;
}

/**
 * Loads the real, locally-installed font programs for the given document
 * families and registers them for precise-mode measurement. No-op unless precise
 * mode is enabled and the Local Font Access API is available (and previously
 * granted). Returns whether any new face was registered, so the caller can clear
 * layout caches and re-project only when something actually changed.
 */
export async function loadPreciseFontProgramsForFamilies(
  families: Iterable<string | null | undefined>,
): Promise<boolean> {
  if (!isPreciseFontModeEnabled()) return false;
  const queryLocalFonts = getQueryLocalFonts();
  if (!queryLocalFonts) return false;

  const wanted = new Set(
    Array.from(families, (family) => normalizeFamily(family).toLowerCase()),
  );
  wanted.delete("helvetica"); // normalizeFamily's empty-input fallback
  if (wanted.size === 0) return false;

  let fonts: LocalFont[];
  try {
    fonts = await queryLocalFonts();
  } catch {
    return false;
  }

  let changed = false;
  const registered: string[] = [];
  const failed: string[] = [];
  let matchedAny = false;
  for (const font of fonts) {
    const family = (font.family ?? "").trim();
    if (!family || !wanted.has(family.toLowerCase())) continue;
    matchedAny = true;
    if (typeof font.blob !== "function") {
      failed.push(`${family} (${font.style ?? "?"}): no blob()`);
      continue;
    }
    const { bold, italic } = classifyFaceStyle(font);
    if (hasPreciseFontFace(family, bold, italic)) continue;
    try {
      const buffer = await font.blob().then((blob) => blob.arrayBuffer());
      const program = selectFaceProgram(new Uint8Array(buffer), font);
      registerPreciseFont(family, bold, italic, program);
      registered.push(
        `${family} ${bold ? "B" : ""}${italic ? "I" : ""}`.trim(),
      );
      changed = true;
    } catch (error) {
      failed.push(`${family} (${font.style ?? "?"}): ${String(error)}`);
    }
  }
  // Diagnostic: for any wanted family that matched nothing, surface the local
  // families whose name contains a wanted token, so a mismatched/renamed install
  // (e.g. "Aptos Display" instead of "Aptos", or an Office cloud font that the
  // browser cannot enumerate at all) is visible instead of failing silently.
  const localFamilies = Array.from(
    new Set(fonts.map((font) => (font.family ?? "").trim()).filter(Boolean)),
  );
  const unmatched = Array.from(wanted).filter(
    (token) => !localFamilies.some((name) => name.toLowerCase() === token),
  );
  const nearMatches = unmatched.flatMap((token) => {
    const stem = token.split(" ")[0]!;
    return localFamilies.filter((name) => name.toLowerCase().includes(stem));
  });
  fontLogger.info("precise:load", {
    wanted: Array.from(wanted),
    matchedAny,
    registered,
    failed,
    changed,
    localFamilyCount: localFamilies.length,
    unmatched,
    nearMatches,
  });
  return changed;
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

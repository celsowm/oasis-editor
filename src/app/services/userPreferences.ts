/**
 * Tiny localStorage-backed user preferences. Synchronous reads let startup
 * decide first-use / precise-font state before the first paint without a flash.
 * All access is wrapped so private-mode / disabled-storage environments degrade
 * to defaults instead of throwing.
 */
const WELCOME_SEEN_KEY = "oasis.welcomeSeen";
const PRECISE_FONT_KEY = "oasis.preciseFontMode";
const AUTO_TAB_INDENT_KEY = "oasis.autoTabIndent";

function safeGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage is optional and may be unavailable in private browsing modes.
  }
}

/** @returns Whether the welcome overlay has been seen. */
export function getWelcomeSeen(): boolean {
  return safeGet(WELCOME_SEEN_KEY) === "1";
}

/** Marks the welcome overlay as seen. */
export function setWelcomeSeen(): void {
  safeSet(WELCOME_SEEN_KEY, "1");
}

/** @returns Whether the user prefers precise font rendering. */
export function getPreciseFontPreference(): boolean {
  return safeGet(PRECISE_FONT_KEY) === "on";
}

/** @param on - Whether precise font rendering should be enabled. */
export function setPreciseFontPreference(on: boolean): void {
  safeSet(PRECISE_FONT_KEY, on ? "on" : "off");
}

/** Word-style first-line indentation is enabled by default, independently of the document. */
export function getAutoTabIndentPreference(): boolean {
  return safeGet(AUTO_TAB_INDENT_KEY) !== "off";
}

export function setAutoTabIndentPreference(enabled: boolean): void {
  safeSet(AUTO_TAB_INDENT_KEY, enabled ? "on" : "off");
}

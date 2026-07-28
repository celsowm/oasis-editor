/**
 * Tiny localStorage-backed user preferences. Synchronous reads let startup
 * decide first-use / precise-font state before the first paint without a flash.
 * All access is wrapped so private-mode / disabled-storage environments degrade
 * to defaults instead of throwing.
 */
const WELCOME_SEEN_KEY = "oasis.welcomeSeen";
const PRECISE_FONT_KEY = "oasis.preciseFontMode";

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

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
    // Storage unavailable (private mode, quota, SSR) — preference is best-effort.
  }
}

export function getWelcomeSeen(): boolean {
  return safeGet(WELCOME_SEEN_KEY) === "1";
}

export function setWelcomeSeen(): void {
  safeSet(WELCOME_SEEN_KEY, "1");
}

export function getPreciseFontPreference(): boolean {
  return safeGet(PRECISE_FONT_KEY) === "on";
}

export function setPreciseFontPreference(on: boolean): void {
  safeSet(PRECISE_FONT_KEY, on ? "on" : "off");
}

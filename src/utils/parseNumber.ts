/**
 * Parses a form-input string into a finite number, or `null` for empty/
 * non-numeric input. Shared across dialogs that bind numeric text fields.
 */
export function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

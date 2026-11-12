/**
 * Parses a form-input string into a finite number, or `null` for empty/
 * non-numeric input. Shared across dialogs that bind numeric text fields.
 */
export function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formats a dot-decimal string for display with the document's decimal
 * separator (`,` in pt-BR, `.` elsewhere). Empty input stays empty, so a blank
 * field (mixed or absent values) never renders a stray separator. Group
 * separators are never produced: every measurement here is a plain decimal.
 */
export function formatDecimal(value: string, separator: string): string {
  if (separator === "." || value === "") return value;
  return value.replace(".", separator);
}

/**
 * Parses a localized decimal string typed into a measurement field. Accepts
 * both the document separator and the dot, so users can paste either form, and
 * ignores the thin/non-breaking spaces some keyboards insert. Returns `null`
 * for empty or non-numeric input.
 */
export function parseDecimal(value: string): number | null {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Raised when a font buffer cannot be parsed as a usable sfnt/TrueType font
 * (missing required tables, truncated data, or an unsupported `cmap` layout).
 *
 * Callers that load fonts opportunistically (e.g. a metrics registry falling
 * back to a heuristic) can catch this to degrade gracefully instead of failing
 * the whole layout pass.
 */
export class TrueTypeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrueTypeParseError";
  }
}

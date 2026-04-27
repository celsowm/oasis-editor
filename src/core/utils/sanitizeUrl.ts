/**
 * Sanitizes a URL for use in an <a href> attribute.
 * Returns null if the URL uses a dangerous protocol (javascript:, data:, vbscript:, etc.).
 * Only allows http:, https:, mailto:, tel:, and relative URLs.
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();

  // Allow relative URLs and empty strings
  if (!trimmed || /^[\/#?]/.test(trimmed)) {
    return trimmed || null;
  }

  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "blob:"];
  const lower = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lower.startsWith(protocol)) {
      return null;
    }
  }

  // Allow only safe protocols
  const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
  try {
    const parsed = new URL(trimmed);
    if (!allowedProtocols.includes(parsed.protocol.toLowerCase())) {
      return null;
    }
  } catch {
    // If URL parsing fails, treat as relative — allow it
    return trimmed;
  }

  return trimmed;
}

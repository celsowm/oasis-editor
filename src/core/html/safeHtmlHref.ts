/**
 * Safe subset of hyperlink destinations for imported/exported HTML.
 * Preserve local anchors, relative URLs, and ordinary web/mail/phone links,
 * but never emit executable schemes such as javascript: or data:.
 */
export function isAllowedHtmlHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  // Reject C0 controls, spaces and DEL anywhere in the destination. Checking
  // code points directly avoids a control-character regex (no-control-regex)
  // while keeping the same allow-list semantics.
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x20 || code === 0x7f) return false;
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!scheme) return true;
  return ["http", "https", "mailto", "tel"].includes(scheme[1]!.toLowerCase());
}

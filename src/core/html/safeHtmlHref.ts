/**
 * Safe subset of hyperlink destinations for imported/exported HTML.
 * Preserve local anchors, relative URLs, and ordinary web/mail/phone links,
 * but never emit executable schemes such as javascript: or data:.
 */
export function isAllowedHtmlHref(href: string): boolean {
  const value = href.trim();
  if (!value || /[\u0000-\u0020\u007f]/.test(value)) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!scheme) return true;
  return ["http", "https", "mailto", "tel"].includes(scheme[1]!.toLowerCase());
}

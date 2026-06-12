import { type Element as XmlElement } from "@xmldom/xmldom";
import { getAttributeValue } from "./xmlHelpers.js";
import { normalizeImportedHexColor } from "./units.js";

export function stripUndefined<T extends object>(
  value: T,
): Partial<T> | undefined {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return entries.length > 0
    ? (Object.fromEntries(entries) as Partial<T>)
    : undefined;
}

export function emptyOrUndefined<T extends object>(obj: T): T | undefined {
  return Object.keys(obj).length > 0 ? obj : undefined;
}

export function mergeStyles<T extends object>(
  base: T | undefined,
  local: T | undefined,
): T | undefined {
  return emptyOrUndefined({ ...(base ?? {}), ...(local ?? {}) } as T);
}

export function parseShdFill(element: XmlElement | null): string | undefined {
  return normalizeImportedHexColor(getAttributeValue(element, "fill"));
}

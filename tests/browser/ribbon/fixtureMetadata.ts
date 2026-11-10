/** Canonicalize generated identities while retaining text and meaningful values. */
export function canonicalReferenceDocument(document: unknown): string {
  const ids = new Map<string, string>();
  const generated = /[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}/i;
  const register = (value: unknown): void => {
    if (typeof value === "string" && generated.test(value) && !ids.has(value))
      ids.set(value, `reference-id-${ids.size + 1}`);
  };
  const collect = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "id") register(child);
      if (key === "assets" && child && typeof child === "object")
        Object.keys(child).forEach(register);
      collect(child);
    }
  };
  collect(document);
  const normalize = (value: unknown, field = ""): unknown => {
    if (typeof value === "string") {
      if (/(?:^id$|Ids?$|^order$)/.test(field) && ids.has(value))
        return ids.get(value);
      if (value.startsWith("asset:") && ids.has(value.slice(6)))
        return `asset:${ids.get(value.slice(6))}`;
      return value;
    }
    if (Array.isArray(value))
      return value.map((child) => normalize(child, field));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          ids.get(key) ?? key,
          normalize(child, key),
        ]),
      );
    return value;
  };
  return JSON.stringify(normalize(document));
}

export async function sha256(value: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function referenceFonts(): object {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  const uiFamily = getComputedStyle(
    document.querySelector(".oasis-editor-toolbar")!,
  ).fontFamily;
  return {
    loaded: document.fonts.status,
    uiFamily,
    faces: Array.from(document.fonts, (face) => ({
      family: face.family,
      style: face.style,
      weight: face.weight,
      status: face.status,
    })),
    samples: [
      "12px system-ui",
      `12px ${uiFamily}`,
      "16px Calibri",
      "16px 'Calibri Light'",
      "16px Arial",
    ].map((font) => {
      context.font = font;
      const metrics = context.measureText("AaBb 0123456789 éçã");
      return {
        font,
        width: metrics.width,
        ascent: metrics.actualBoundingBoxAscent,
        descent: metrics.actualBoundingBoxDescent,
      };
    }),
  };
}

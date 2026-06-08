/**
 * Style resolution: named-style chain walking, three-level merge
 * (defaults ← named ← local) and "effective style" derivation.
 *
 * Single source of truth for the cascading policy. The old
 * `mergeTextStyles` / `mergeParagraphStyles` pair is now backed by a
 * generic `createObjectMerger<T>` so the same algorithm serves every
 * style type (DIP: depends on a merger abstraction, not on two copy-pasted
 * implementations).
 */
import type {
  EditorNamedStyle,
  EditorParagraphStyle,
  EditorTextStyle,
} from "./types/styles.js";
import {
  DEFAULT_PARAGRAPH_STYLE,
  DEFAULT_TEXT_STYLE,
} from "./styleDefaults.js";

/**
 * A "mergeable" style is any object whose own enumerable string keys can
 * be copied with `Object.entries`. We accept any object shape — real
 * style interfaces don't declare an index signature and shouldn't have to.
 */
export type Mergeable = object;

export interface StyleMerger<T> {
  merge(resolved: T, local: Partial<T> | undefined): T;
}

export function createObjectMerger<T>(): StyleMerger<T> {
  return {
    merge(resolved, local) {
      if (!local) {
        return { ...(resolved as object) } as T;
      }
      const out: Record<string, unknown> = { ...(resolved as object) };
      for (const [key, value] of Object.entries(
        local as Record<string, unknown>,
      )) {
        if (value !== undefined) {
          out[key] = value;
        }
      }
      return out as T;
    },
  };
}

export const textStyleMerger = createObjectMerger<EditorTextStyle>();
export const paragraphStyleMerger = createObjectMerger<EditorParagraphStyle>();

/**
 * Merge policy used throughout the editor:
 *  - `undefined` in `local` → inherit from `resolved` (key is skipped)
 *  - `null` in `local`    → reset to system default (caller handles `null`)
 *  - any other value      → override `resolved`
 */
export function mergeTextStyles(
  resolved: EditorTextStyle,
  local: EditorTextStyle | undefined,
): EditorTextStyle {
  return textStyleMerger.merge(resolved, local);
}

export function mergeParagraphStyles(
  resolved: EditorParagraphStyle,
  local: EditorParagraphStyle | undefined,
): EditorParagraphStyle {
  return paragraphStyleMerger.merge(resolved, local);
}

export function resolveDefaultParagraphStyleId(
  styles: Record<string, EditorNamedStyle> | undefined,
): string | undefined {
  if (!styles) {
    return undefined;
  }

  const exactNormal = Object.values(styles).find(
    (style) =>
      style.type === "paragraph" && style.id.toLowerCase() === "normal",
  );
  if (exactNormal) {
    return exactNormal.id;
  }

  const namedNormal = Object.values(styles).find(
    (style) =>
      style.type === "paragraph" && style.name.toLowerCase() === "normal",
  );
  if (namedNormal) {
    return namedNormal.id;
  }

  return undefined;
}

export function resolveNamedTextStyle(
  styleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorTextStyle {
  if (!styleId || !styles || !styles[styleId]) {
    return {};
  }

  const namedStyle = styles[styleId];
  const baseStyle = namedStyle.basedOn
    ? resolveNamedTextStyle(namedStyle.basedOn, styles)
    : {};

  return {
    ...baseStyle,
    ...(namedStyle.textStyle ?? {}),
  };
}

export function resolveNamedParagraphStyle(
  styleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorParagraphStyle {
  if (!styleId || !styles || !styles[styleId]) {
    return {};
  }

  const namedStyle = styles[styleId];
  const baseStyle = namedStyle.basedOn
    ? resolveNamedParagraphStyle(namedStyle.basedOn, styles)
    : {};

  return {
    ...baseStyle,
    ...(namedStyle.paragraphStyle ?? {}),
  };
}

/**
 * Resolve the effective text style for a run:
 * 1. Resolve named style via styleId + basedOn chain
 * 2. Apply local overrides (undefined → inherit, null → keep as null for reset)
 * 3. Fill in system defaults for any remaining undefined values
 */
export function resolveEffectiveTextStyle(
  style: EditorTextStyle | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): Required<EditorTextStyle> {
  const named = resolveNamedTextStyle(style?.styleId, styles);
  const merged = mergeTextStyles(named, style);
  return { ...DEFAULT_TEXT_STYLE, ...merged };
}

/**
 * Resolve the effective text style for a run, inheriting textStyle from the
 * paragraph named style when the run does not override it locally.
 */
export function resolveEffectiveTextStyleForParagraph(
  style: EditorTextStyle | undefined,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): Required<EditorTextStyle> {
  const effectiveParagraphStyleId =
    paragraphStyleId ?? resolveDefaultParagraphStyleId(styles);
  const paragraphNamed = resolveNamedTextStyle(
    effectiveParagraphStyleId,
    styles,
  );
  const runNamed = resolveNamedTextStyle(style?.styleId, styles);
  const inherited = mergeTextStyles(paragraphNamed, runNamed);
  const merged = mergeTextStyles(inherited, style);
  return { ...DEFAULT_TEXT_STYLE, ...merged };
}

/**
 * Resolve the effective paragraph style:
 * 1. Resolve named style via styleId + basedOn chain
 * 2. Apply local overrides (undefined → inherit, null → keep as null for reset)
 * 3. Fill in system defaults for any remaining undefined values
 */
export function resolveEffectiveParagraphStyle(
  style: EditorParagraphStyle | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): Required<EditorParagraphStyle> {
  const effectiveStyleId =
    style?.styleId ?? resolveDefaultParagraphStyleId(styles);
  const named = resolveNamedParagraphStyle(effectiveStyleId, styles);
  const merged = mergeParagraphStyles(named, {
    ...style,
    styleId: effectiveStyleId,
  });
  return { ...DEFAULT_PARAGRAPH_STYLE, ...merged };
}

import type { EditorParagraphStyle, EditorTextStyle } from "@/core/model.js";
import type {
  ToggleableTextStyleKey,
  ValueParagraphStyleKey,
  ValueTextStyleKey,
} from "./textStyleKeys.js";

export function cloneStyle(
  style?: EditorTextStyle,
): EditorTextStyle | undefined {
  return style ? { ...style } : undefined;
}

export function stylesEqual(
  left?: EditorTextStyle,
  right?: EditorTextStyle,
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function setBooleanStyle(
  style: EditorTextStyle | undefined,
  key: ToggleableTextStyleKey,
  enabled: boolean,
): EditorTextStyle | undefined {
  const next = { ...(style ?? {}) } as EditorTextStyle &
    Record<string, unknown>;

  if (enabled) {
    next[key] = true;
  } else {
    delete next[key];
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function setValueStyle<K extends ValueTextStyleKey>(
  style: EditorTextStyle | undefined,
  key: K,
  value: EditorTextStyle[K] | null,
): EditorTextStyle | undefined {
  const next = { ...(style ?? {}) } as Record<string, unknown>;

  if (value === null || value === undefined || value === "") {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0 ? (next as EditorTextStyle) : undefined;
}

export function setParagraphStyleValue<K extends ValueParagraphStyleKey>(
  style: EditorParagraphStyle | undefined,
  key: K,
  value: EditorParagraphStyle[K] | null,
): EditorParagraphStyle | undefined {
  const next = { ...(style ?? {}) } as Record<string, unknown>;

  if (value === null || value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0
    ? (next as EditorParagraphStyle)
    : undefined;
}

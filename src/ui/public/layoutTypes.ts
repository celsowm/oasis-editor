import type { JSX } from "solid-js";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

export type SpacingValue = number | string;
export type StackDirection =
  | "row"
  | "row-reverse"
  | "column"
  | "column-reverse";
export type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";
export type FlexAlign =
  | "flex-start"
  | "center"
  | "flex-end"
  | "stretch"
  | "baseline";
export type FlexJustify =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";
export type GridSize = number | "auto" | "grow" | false;
export type GridOffset = number | "auto";

export const BREAKPOINTS: Breakpoint[] = ["xs", "sm", "md", "lg", "xl"];

export function isResponsiveObject<T>(
  value: ResponsiveValue<T> | undefined,
): value is Partial<Record<Breakpoint, T>> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    BREAKPOINTS.some((breakpoint) => breakpoint in value)
  );
}

export function toResponsiveRecord<T>(
  value: ResponsiveValue<T> | undefined,
): Partial<Record<Breakpoint, T>> {
  if (value === undefined) return {};
  if (isResponsiveObject(value)) return value;
  return { xs: value };
}

export function spacingToCss(value: SpacingValue): string {
  return typeof value === "number" ? `${value * 8}px` : value;
}

export function responsiveCssVars<T>(
  prefix: string,
  value: ResponsiveValue<T> | undefined,
  transform: (value: T) => string,
): JSX.CSSProperties {
  const vars: Record<string, string> = {};
  const record = toResponsiveRecord(value);
  for (const breakpoint of BREAKPOINTS) {
    const breakpointValue = record[breakpoint];
    if (breakpointValue !== undefined) {
      vars[`--${prefix}-${breakpoint}`] = transform(breakpointValue);
    }
  }
  return vars as JSX.CSSProperties;
}

export function mergeStyles(
  ...styles: Array<JSX.CSSProperties | string | undefined>
): JSX.CSSProperties | string | undefined {
  const serializeObjectStyle = (style: JSX.CSSProperties) =>
    Object.entries(style)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join("; ");

  const objectStyles = styles.filter(
    (style): style is JSX.CSSProperties =>
      typeof style === "object" && style !== null,
  );
  const stringStyle = styles.find(
    (style): style is string => typeof style === "string",
  );

  if (stringStyle && objectStyles.length === 0) return stringStyle;
  if (stringStyle) {
    const mergedObjectStyle = Object.assign({}, ...objectStyles);
    const serialized = serializeObjectStyle(mergedObjectStyle);
    return serialized ? `${stringStyle}; ${serialized}` : stringStyle;
  }
  return Object.assign({}, ...objectStyles);
}

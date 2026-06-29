import { splitProps, type JSX, type ParentProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  BREAKPOINTS,
  mergeStyles,
  responsiveCssVars,
  spacingToCss,
  toResponsiveRecord,
  type Breakpoint,
  type FlexAlign,
  type FlexJustify,
  type FlexWrap,
  type GridOffset,
  type GridSize,
  type ResponsiveValue,
  type SpacingValue,
  type StackDirection,
} from "./layoutTypes.js";

export interface GridProps extends ParentProps<
  JSX.HTMLAttributes<HTMLElement>
> {
  container?: boolean;
  size?: ResponsiveValue<GridSize>;
  columns?: ResponsiveValue<number>;
  spacing?: ResponsiveValue<SpacingValue>;
  rowSpacing?: ResponsiveValue<SpacingValue>;
  columnSpacing?: ResponsiveValue<SpacingValue>;
  direction?: ResponsiveValue<StackDirection>;
  offset?: ResponsiveValue<GridOffset>;
  wrap?: ResponsiveValue<FlexWrap>;
  alignItems?: ResponsiveValue<FlexAlign>;
  justifyContent?: ResponsiveValue<FlexJustify>;
  component?: keyof JSX.IntrinsicElements;
}

/**
 * Resolved column-gap for a breakpoint, as a nested `var()` fallback chain from
 * the requested breakpoint down to `xs` (and finally `0px`). The container sets
 * `--oasis-grid-column-spacing-*` in its inline style and items inherit it, so
 * an item can subtract the gap it consumes from its own basis (MUI Grid v2 "gap
 * compensation"). Without this, columns sized to sum to 12 plus the container's
 * `column-gap` overflow the row and the last item wraps to its own line.
 */
function columnSpacingVar(breakpoint: Breakpoint): string {
  const index = BREAKPOINTS.indexOf(breakpoint);
  let expr = "0px";
  for (let i = 0; i <= index; i++) {
    expr = `var(--oasis-grid-column-spacing-${BREAKPOINTS[i]}, ${expr})`;
  }
  return expr;
}

function gridSizeVars(
  value: ResponsiveValue<GridSize> | undefined,
): JSX.CSSProperties {
  const vars: Record<string, string> = {};
  const record = toResponsiveRecord(value);
  for (const breakpoint of BREAKPOINTS) {
    const size = record[breakpoint];
    if (size === undefined) continue;
    if (typeof size === "number") {
      const gap = columnSpacingVar(breakpoint);
      // width = span/cols * 100% − gap * (cols − span)/cols.
      // A full row of spans summing to `cols` then totals exactly
      // 100% − (count − 1) * gap, leaving room for the container's column-gap.
      const basis =
        `calc(${size} / var(--oasis-grid-columns-current) * 100% - ` +
        `${gap} * (var(--oasis-grid-columns-current) - ${size}) / ` +
        `var(--oasis-grid-columns-current))`;
      vars[`--oasis-grid-size-basis-${breakpoint}`] = basis;
      vars[`--oasis-grid-size-grow-${breakpoint}`] = "0";
      vars[`--oasis-grid-size-max-${breakpoint}`] = basis;
      continue;
    }
    if (size === "grow") {
      vars[`--oasis-grid-size-basis-${breakpoint}`] = "0";
      vars[`--oasis-grid-size-grow-${breakpoint}`] = "1";
      vars[`--oasis-grid-size-max-${breakpoint}`] = "100%";
      continue;
    }
    vars[`--oasis-grid-size-basis-${breakpoint}`] = "auto";
    vars[`--oasis-grid-size-grow-${breakpoint}`] = "0";
    vars[`--oasis-grid-size-max-${breakpoint}`] = "none";
  }
  return vars as JSX.CSSProperties;
}

function gridOffsetVars(
  value: ResponsiveValue<GridOffset> | undefined,
): JSX.CSSProperties {
  const vars: Record<string, string> = {};
  const record = toResponsiveRecord(value);
  for (const breakpoint of BREAKPOINTS) {
    const offset = record[breakpoint];
    if (offset === undefined) continue;
    vars[`--oasis-grid-offset-${breakpoint}`] =
      offset === "auto"
        ? "auto"
        : `calc(${offset} / var(--oasis-grid-columns-current) * 100%)`;
  }
  return vars as JSX.CSSProperties;
}

export function Grid(props: GridProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "container",
    "size",
    "columns",
    "spacing",
    "rowSpacing",
    "columnSpacing",
    "direction",
    "offset",
    "wrap",
    "alignItems",
    "justifyContent",
    "component",
    "class",
    "classList",
    "style",
    "children",
  ]);

  const style = (): string | JSX.CSSProperties | undefined =>
    mergeStyles(
      gridSizeVars(local.size),
      gridOffsetVars(local.offset),
      responsiveCssVars("oasis-grid-columns", local.columns, String),
      responsiveCssVars(
        "oasis-grid-row-spacing",
        local.rowSpacing ?? local.spacing,
        spacingToCss,
      ),
      responsiveCssVars(
        "oasis-grid-column-spacing",
        local.columnSpacing ?? local.spacing,
        spacingToCss,
      ),
      responsiveCssVars(
        "oasis-grid-direction",
        local.direction ?? "row",
        String,
      ),
      responsiveCssVars("oasis-grid-wrap", local.wrap ?? "wrap", String),
      responsiveCssVars("oasis-grid-align", local.alignItems, String),
      responsiveCssVars("oasis-grid-justify", local.justifyContent, String),
      local.style,
    );

  return (
    <Dynamic
      component={local.component ?? "div"}
      class={`oasis-editor-ui-grid ${local.class ?? ""}`}
      classList={{
        "oasis-editor-ui-grid-container": local.container,
        "oasis-editor-ui-grid-item": true,
        ...local.classList,
      }}
      style={style()}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}

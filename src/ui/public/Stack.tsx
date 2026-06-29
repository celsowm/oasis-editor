import {
  For,
  Show,
  children,
  splitProps,
  type JSX,
  type ParentProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  mergeStyles,
  responsiveCssVars,
  spacingToCss,
  type FlexAlign,
  type FlexJustify,
  type ResponsiveValue,
  type SpacingValue,
  type StackDirection,
} from "./layoutTypes.js";

export interface StackProps extends ParentProps<
  JSX.HTMLAttributes<HTMLElement>
> {
  direction?: ResponsiveValue<StackDirection>;
  spacing?: ResponsiveValue<SpacingValue>;
  divider?: JSX.Element | ((index: number) => JSX.Element);
  useFlexGap?: boolean;
  alignItems?: ResponsiveValue<FlexAlign>;
  justifyContent?: ResponsiveValue<FlexJustify>;
  component?: keyof JSX.IntrinsicElements;
}

function childArray(value: JSX.Element): JSX.Element[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === false) return [];
  return [value];
}

export function Stack(props: StackProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "direction",
    "spacing",
    "divider",
    "useFlexGap",
    "alignItems",
    "justifyContent",
    "component",
    "class",
    "classList",
    "style",
    "children",
  ]);
  const resolvedChildren = children((): JSX.Element => local.children);
  const items = (): JSX.Element[] => childArray(resolvedChildren());
  const renderDivider = (index: number): JSX.Element =>
    typeof local.divider === "function" ? local.divider(index) : local.divider;

  const style = (): string | JSX.CSSProperties | undefined =>
    mergeStyles(
      responsiveCssVars(
        "oasis-stack-direction",
        local.direction ?? "column",
        String,
      ),
      responsiveCssVars(
        "oasis-stack-spacing",
        local.spacing ?? 0,
        spacingToCss,
      ),
      responsiveCssVars("oasis-stack-align", local.alignItems, String),
      responsiveCssVars("oasis-stack-justify", local.justifyContent, String),
      local.style,
    );

  return (
    <Dynamic
      component={local.component ?? "div"}
      class={`oasis-editor-ui-stack ${local.class ?? ""}`}
      classList={{
        "oasis-editor-ui-stack-flex-gap": local.useFlexGap !== false,
        "oasis-editor-ui-stack-divider": Boolean(local.divider),
        ...local.classList,
      }}
      style={style()}
      {...others}
    >
      <For each={items()}>
        {(item, index): JSX.Element => (
          <>
            <Show when={index() > 0 && local.divider}>
              <span
                class="oasis-editor-ui-stack-divider-item"
                aria-hidden="true"
              >
                {renderDivider(index())}
              </span>
            </Show>
            {item}
          </>
        )}
      </For>
    </Dynamic>
  );
}

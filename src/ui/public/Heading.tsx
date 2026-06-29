import { splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface HeadingProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading(props: HeadingProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "level",
    "class",
    "classList",
    "children",
  ]);
  const level = local.level ?? 2;
  return (
    <Dynamic
      component={`h${level}`}
      class={`oasis-editor-ui-heading ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-ui-heading-${level}`]: true,
        ...local.classList,
      }}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}

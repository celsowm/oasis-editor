import { splitProps, type JSX } from "solid-js";

export interface SidePanelProps extends JSX.HTMLAttributes<HTMLElement> {
  mode?: "dock" | "overlay";
  width?: number | string;
}

export function SidePanel(props: SidePanelProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "mode",
    "width",
    "class",
    "classList",
    "children",
    "style",
  ]);
  const width = (): string => {
    if (typeof local.width === "number") {
      return `${local.width}px`;
    }
    return local.width ?? "360px";
  };

  return (
    <aside
      class={`oasis-editor-plugin-side-panel ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-plugin-side-panel-${local.mode ?? "dock"}`]: true,
        ...local.classList,
      }}
      style={{
        "--oasis-plugin-side-panel-width": width(),
        ...(local.style as JSX.CSSProperties | undefined),
      }}
      {...others}
    >
      {local.children}
    </aside>
  );
}

export interface SidePanelSectionProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export function SidePanelHeader(props: SidePanelSectionProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={`oasis-editor-plugin-side-panel-header ${local.class ?? ""}`}
      {...others}
    >
      {local.children}
    </div>
  );
}

export function SidePanelBody(props: SidePanelSectionProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={`oasis-editor-plugin-side-panel-body ${local.class ?? ""}`}
      {...others}
    >
      {local.children}
    </div>
  );
}

export function SidePanelFooter(props: SidePanelSectionProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={`oasis-editor-plugin-side-panel-footer ${local.class ?? ""}`}
      {...others}
    >
      {local.children}
    </div>
  );
}

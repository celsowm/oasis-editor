import type { JSX } from "solid-js";

export interface TitleBarProps {
  children?: JSX.Element;
}

export function TitleBar(props: TitleBarProps) {
  return (
    <div class="oasis-titlebar">
      <div class="oasis-titlebar-left">
        <div class="oasis-titlebar-menubar-slot">{props.children}</div>
      </div>
    </div>
  );
}

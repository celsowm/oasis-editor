import { For } from "solid-js";
import { ToolbarItemRenderer } from "../renderers/ToolbarItemRenderer.js";
import type { ToolbarActionApi, ToolbarItem } from "../schema/items.js";

export interface RibbonRowProps {
  items: ToolbarItem[];
  api: ToolbarActionApi;
}

export function RibbonRow(props: RibbonRowProps) {
  return (
    <div class="oasis-editor-ribbon-row">
      <For each={props.items}>
        {(item) => <ToolbarItemRenderer item={item} api={props.api} />}
      </For>
    </div>
  );
}

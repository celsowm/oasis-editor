import { For } from "solid-js";
import { ToolbarItemRenderer } from "@/ui/components/Toolbar/renderers/ToolbarItemRenderer.js";
import type {
  ToolbarActionApi,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import { JSX } from "solid-js";

export interface RibbonRowProps {
  items: ToolbarItem[];
  api: ToolbarActionApi;
}

export function RibbonRow(props: RibbonRowProps): JSX.Element {
  return (
    <div class="oasis-editor-ribbon-row">
      <For each={props.items}>
        {(item): JSX.Element => <ToolbarItemRenderer item={item} api={props.api} />}
      </For>
    </div>
  );
}

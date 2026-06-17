import { For, Show, type JSX } from "solid-js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import { ToolbarItemRenderer } from "@/ui/components/Toolbar/renderers/ToolbarItemRenderer.js";
import type { RibbonGroupModel } from "./ribbonModel.js";
import { RibbonRow } from "./RibbonRow.js";

export interface RibbonGroupProps {
  group: RibbonGroupModel;
  api: ToolbarActionApi;
}

export function RibbonGroup(props: RibbonGroupProps): JSX.Element {
  return (
    <section
      class="oasis-editor-ribbon-group"
      data-ribbon-group={props.group.id}
      aria-label={props.group.label}
    >
      <div class="oasis-editor-ribbon-group-rows">
        <Show when={props.group.largeItems.length > 0}>
          <div class="oasis-editor-ribbon-large-items">
            <For each={props.group.largeItems}>
              {(item) => <ToolbarItemRenderer item={item} api={props.api} />}
            </For>
          </div>
        </Show>
        <div class="oasis-editor-ribbon-normal-rows">
          <RibbonRow items={props.group.rows[1]} api={props.api} />
          <RibbonRow items={props.group.rows[2]} api={props.api} />
        </div>
      </div>
      <div class="oasis-editor-ribbon-group-label">{props.group.label}</div>
    </section>
  );
}

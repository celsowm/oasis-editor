import { Dynamic } from "solid-js/web";
import { Show, type JSX } from "solid-js";
import type { ToolbarActionApi, ToolbarItem } from "../schema/items.js";
import { bindItem } from "../state/bindItem.js";
import { resolveRenderer } from "./renderers.js";

/**
 * Renders a single toolbar item by dispatching on its `type` to the renderer
 * map. Wraps each item so contextual visibility toggles `display` instead of
 * unmounting — required by the imperative OverflowManager (DOM moves break if
 * the child count changes).
 */
export function ToolbarItemRenderer(props: {
  item: ToolbarItem;
  api: ToolbarActionApi;
}): JSX.Element {
  const binding = bindItem(props.item, props.api);
  const component = () => resolveRenderer(props.item.type);

  return (
    <div
      class="oasis-editor-toolbar-item"
      style={{
        display: binding.visible() ? "flex" : "none",
        "align-items": "center",
      }}
    >
      <Show when={component()}>
        {(comp) => (
          <Dynamic component={comp()} item={props.item} api={props.api} />
        )}
      </Show>
    </div>
  );
}

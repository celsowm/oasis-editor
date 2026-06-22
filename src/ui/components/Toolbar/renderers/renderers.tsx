import { For, Show, createSignal, type Component, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type {
  ButtonItem,
  ColorPickerItem,
  CustomItem,
  GridPickerItem,
  GroupItem,
  MenuContent,
  MenuItem,
  SelectItem,
  StyleGalleryItem,
  SeparatorItem,
  SplitItem,
  ToggleItem,
  ToolbarActionApi,
  ToolbarItem,
  ToolbarItemType,
} from "@/ui/components/Toolbar/schema/items.js";
import {
  bindItem,
  resolveLabel,
  resolveTooltip,
  runItem,
} from "@/ui/components/Toolbar/state/bindItem.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { Select } from "@/ui/components/Toolbar/primitives/Select.js";
import { Separator } from "@/ui/components/Toolbar/primitives/Separator.js";
import { ColorPicker } from "@/ui/components/Toolbar/primitives/ColorPicker.js";
import { GridPicker } from "@/ui/components/Toolbar/primitives/GridPicker.js";
import { SplitButton } from "@/ui/components/Toolbar/primitives/SplitButton.js";
import { DEFAULT_PALETTE } from "@/ui/components/Toolbar/presets/defaultPalette.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import { StyleGallery } from "@/ui/components/Toolbar/StyleGallery.js";

export interface RendererProps<I extends ToolbarItem = ToolbarItem> {
  item: I;
  api: ToolbarActionApi;
}

function renderMenuContent(
  content: MenuContent,
  api: ToolbarActionApi,
): JSX.Element {
  if (content.kind === "custom") {
    return content.render(api);
  }
  return (
    <For each={content.items}>
      {(child) => <ToolbarItemRenderer item={child} api={api} />}
    </For>
  );
}

function RenderButton(props: RendererProps<ButtonItem>): JSX.Element {
  const b = bindItem(props.item, props.api);
  return (
    <Button
      icon={props.item.iconName}
      label={resolveLabel(props.item, props.api)}
      wide={props.item.wide}
      ribbonSize={props.item.ribbonSize}
      active={b.active()}
      disabled={b.disabled()}
      data-testid={props.item.testId}
      tooltip={resolveTooltip(props.item, props.api)}
      onClick={() => runItem(props.item, props.api)}
    />
  );
}

function RenderToggle(props: RendererProps<ToggleItem>): JSX.Element {
  const b = bindItem(props.item, props.api);
  return (
    <Button
      icon={props.item.iconName}
      label={resolveLabel(props.item, props.api)}
      wide={props.item.wide}
      ribbonSize={props.item.ribbonSize}
      active={b.active()}
      disabled={b.disabled()}
      data-testid={props.item.testId}
      tooltip={resolveTooltip(props.item, props.api)}
      onClick={() => runItem(props.item, props.api)}
    />
  );
}

function RenderMenu(props: RendererProps<MenuItem>): JSX.Element {
  const b = bindItem(props.item, props.api);
  return (
    <Menu
      icon={props.item.iconName}
      label={resolveLabel(props.item, props.api)}
      tooltip={resolveTooltip(props.item, props.api)}
      testId={props.item.testId}
      active={b.active()}
      disabled={b.disabled()}
      hideChevron={props.item.hideChevron}
      ribbonSize={props.item.ribbonSize}
      panelClass={props.item.panelClass}
      keepMounted={props.item.keepMounted}
    >
      {renderMenuContent(props.item.content, props.api)}
    </Menu>
  );
}

function RenderSplit(props: RendererProps<SplitItem>): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const b = bindItem(props.item, props.api);
  return (
    <SplitButton
      open={open()}
      onOpenChange={setOpen}
      tooltip={resolveTooltip(props.item, props.api)}
      rootActive={b.active() || open()}
      mainTestId={props.item.testId}
      mainPressed={b.active()}
      onMain={() => runItem(props.item, props.api)}
      menuTestId={
        props.item.testId ? `${props.item.testId}-dropdown` : undefined
      }
      panelClass={props.item.panelClass ?? "oasis-editor-color-menu"}
      panelRole="menu"
      mainContent={
        props.item.iconName ? <ToolIcon name={props.item.iconName} /> : <></>
      }
    >
      {renderMenuContent(props.item.menu, props.api)}
    </SplitButton>
  );
}

function RenderSelect(props: RendererProps<SelectItem>): JSX.Element {
  const b = bindItem(props.item, props.api);
  const onChange: JSX.EventHandler<HTMLSelectElement, Event> = (event) => {
    const value = event.currentTarget.value;
    props.api.commands.execute(props.item.command, value);
  };
  return (
    <Select
      wide={props.item.width === "wide"}
      small={props.item.width === "small"}
      value={(b.value() as string | undefined) ?? ""}
      data-testid={props.item.testId}
      tooltip={resolveTooltip(props.item, props.api)}
      onChange={onChange}
    >
      <Show when={props.item.placeholder !== undefined}>
        <option value="">{props.item.placeholder}</option>
      </Show>
      <For each={props.item.options(props.api)}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </Select>
  );
}

function RenderStyleGallery(
  props: RendererProps<StyleGalleryItem>,
): JSX.Element {
  return <StyleGallery item={props.item} api={props.api} />;
}

function RenderColorPicker(props: RendererProps<ColorPickerItem>): JSX.Element {
  const [lastValue, setLastValue] = createSignal(props.item.defaultValue);
  const b = bindItem(props.item, props.api);
  const apply = (value: string | null): void => {
    if (value) setLastValue(value);
    props.api.commands.execute(props.item.command, value);
  };
  return (
    <ColorPicker
      kind={props.item.kind}
      icon={
        props.item.iconName ??
        (props.item.kind === "color"
          ? "type"
          : props.item.kind === "shading"
            ? "paint-bucket"
            : "highlighter")
      }
      value={(b.value() as string | null | undefined) ?? null}
      defaultValue={props.item.defaultValue}
      lastValue={lastValue()}
      tooltip={resolveTooltip(props.item, props.api) ?? ""}
      testId={props.item.testId ?? props.item.id}
      palette={props.item.palette ?? DEFAULT_PALETTE}
      automaticLabel={props.api.t("toolbar.colorAutomatic")}
      noColorLabel={props.api.t(
        props.item.kind === "shading"
          ? "toolbar.noTextShading"
          : "toolbar.noHighlight",
      )}
      themeColorsLabel={props.api.t("toolbar.themeColors")}
      standardColorsLabel={props.api.t("toolbar.standardColors")}
      moreColorsLabel={props.api.t("toolbar.moreColors")}
      onApply={apply}
    />
  );
}

function RenderGridPicker(props: RendererProps<GridPickerItem>): JSX.Element {
  const onSelect = (rows: number, cols: number): void => {
    props.api.commands.execute(props.item.command, { rows, cols });
  };
  return (
    <GridPicker
      testId={props.item.testId}
      tooltip={resolveTooltip(props.item, props.api)}
      icon={props.item.iconName}
      maxRows={props.item.maxRows}
      maxCols={props.item.maxCols}
      onSelect={onSelect}
    />
  );
}

function RenderSeparator(_props: RendererProps<SeparatorItem>): JSX.Element {
  return <Separator />;
}

function RenderGroup(props: RendererProps<GroupItem>): JSX.Element {
  return (
    <For each={props.item.items}>
      {(child) => <ToolbarItemRenderer item={child} api={props.api} />}
    </For>
  );
}

function RenderCustom(props: RendererProps<CustomItem>): JSX.Element {
  return props.item.render(props.api);
}

export const TOOLBAR_RENDERERS: Record<
  ToolbarItemType,
  Component<RendererProps>
> = {
  button: RenderButton as Component<RendererProps>,
  toggle: RenderToggle as Component<RendererProps>,
  split: RenderSplit as Component<RendererProps>,
  menu: RenderMenu as Component<RendererProps>,
  select: RenderSelect as Component<RendererProps>,
  styleGallery: RenderStyleGallery as Component<RendererProps>,
  colorPicker: RenderColorPicker as Component<RendererProps>,
  gridPicker: RenderGridPicker as Component<RendererProps>,
  separator: RenderSeparator as Component<RendererProps>,
  group: RenderGroup as Component<RendererProps>,
  custom: RenderCustom as Component<RendererProps>,
};

/** Custom item-type renderers registered by client code (OCP escape hatch). */
const customRenderers = new Map<string, Component<RendererProps>>();

/**
 * Register a renderer for a custom item `type`. Lets consumers add entirely new
 * control kinds without modifying the toolbar core.
 */
export function registerToolbarRenderer(
  type: string,
  component: Component<RendererProps>,
): void {
  customRenderers.set(type, component);
}

export function resolveRenderer(
  type: string,
): Component<RendererProps> | undefined {
  return (
    TOOLBAR_RENDERERS[type as ToolbarItemType] ?? customRenderers.get(type)
  );
}

/**
 * Renders a single toolbar item by dispatching on its `type` to the renderer
 * map. Wraps each item so contextual visibility toggles `display` instead of
 * unmounting — required by the imperative OverflowManager (DOM moves break if
 * the child count changes).
 *
 * Defined here (alongside the renderers it dispatches to) because the two are
 * mutually recursive: menu/group renderers render child items through this
 * component, which in turn resolves them back to those renderers. Keeping the
 * recursion intra-module avoids an import cycle.
 */
export function ToolbarItemRenderer(props: {
  item: ToolbarItem;
  api: ToolbarActionApi;
}): JSX.Element {
  const binding = bindItem(props.item, props.api);
  const component = (): ReturnType<typeof resolveRenderer> =>
    resolveRenderer(props.item.type);

  return (
    <div
      class="oasis-editor-toolbar-item"
      classList={{
        "oasis-editor-toolbar-item-ribbon-large":
          "ribbonSize" in props.item && props.item.ribbonSize === "large",
      }}
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

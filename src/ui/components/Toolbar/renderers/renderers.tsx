import { For, Show, createSignal, type Component, type JSX } from "solid-js";
import type {
  ButtonItem,
  ColorPickerItem,
  CustomItem,
  GridPickerItem,
  GroupItem,
  MenuContent,
  MenuItem,
  SelectItem,
  SeparatorItem,
  SplitItem,
  ToggleItem,
  ToolbarActionApi,
  ToolbarItem,
  ToolbarItemType,
} from "../schema/items.js";
import {
  bindItem,
  resolveLabel,
  resolveTooltip,
  runItem,
} from "../state/bindItem.js";
import { Button } from "../primitives/Button.js";
import { Menu } from "../primitives/Menu.js";
import { Select } from "../primitives/Select.js";
import { Separator } from "../primitives/Separator.js";
import { ColorPicker } from "../primitives/ColorPicker.js";
import { GridPicker } from "../primitives/GridPicker.js";
import { SplitButton } from "../primitives/SplitButton.js";
import { DEFAULT_PALETTE } from "../presets/defaultPalette.js";
import { ToolbarItemRenderer } from "./ToolbarItemRenderer.js";

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
      panelClass="oasis-editor-color-menu"
      panelRole="menu"
      mainContent={<i data-lucide={props.item.iconName} />}
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

function RenderColorPicker(props: RendererProps<ColorPickerItem>): JSX.Element {
  const [lastValue, setLastValue] = createSignal(props.item.defaultValue);
  const b = bindItem(props.item, props.api);
  const apply = (value: string | null) => {
    if (value) setLastValue(value);
    props.api.commands.execute(props.item.command, value);
  };
  return (
    <ColorPicker
      kind={props.item.kind}
      icon={
        props.item.iconName ??
        (props.item.kind === "highlight" ? "highlighter" : "type")
      }
      value={(b.value() as string | null | undefined) ?? null}
      defaultValue={props.item.defaultValue}
      lastValue={lastValue()}
      tooltip={resolveTooltip(props.item, props.api) ?? ""}
      testId={props.item.testId ?? props.item.id}
      palette={props.item.palette ?? DEFAULT_PALETTE}
      automaticLabel={props.api.t("toolbar.colorAutomatic")}
      noColorLabel={props.api.t("toolbar.noHighlight")}
      themeColorsLabel={props.api.t("toolbar.themeColors")}
      standardColorsLabel={props.api.t("toolbar.standardColors")}
      moreColorsLabel={props.api.t("toolbar.moreColors")}
      onApply={apply}
    />
  );
}

function RenderGridPicker(props: RendererProps<GridPickerItem>): JSX.Element {
  const onSelect = (rows: number, cols: number) => {
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

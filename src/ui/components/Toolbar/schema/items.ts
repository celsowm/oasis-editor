import type { JSX } from "solid-js";
import type { CommandBus } from "../../../../core/commands/CommandBus.js";
import type { CommandRef } from "../../../../core/commands/CommandRef.js";
import type { TranslationKey } from "../../../../i18n/index.js";
import type { ColorPalette } from "./palette.js";

export const RIBBON_TABS = [
  "file",
  "home",
  "insert",
  "draw",
  "layout",
  "references",
  "collaboration",
  "protection",
  "view",
  "plugins",
  "ai",
] as const;

export type RibbonTabId = (typeof RIBBON_TABS)[number];
export type RibbonRow = 1 | 2;

/** Reactive snapshot of a command's state, as consumed by toolbar items. */
export interface ToolbarCommandState {
  isEnabled: boolean;
  isActive: boolean;
  value: unknown;
}

/**
 * Narrow, read-only view of a document's named style. Carried as the value of
 * the `documentStyles` command, for building select option lists.
 */
export interface ToolbarDocumentStyle {
  id: string;
  name: string;
  fontFamily?: string;
  fontSize?: number;
}

/**
 * Narrow surface every toolbar item depends on (DIP/ISP). Items only dispatch
 * and observe commands — they never touch editor internals or `EditorState`.
 * Even option-list data (e.g. document styles) arrives via `commandState`.
 */
export interface ToolbarActionApi {
  commands: CommandBus<ToolbarCommandState>;
  t(key: TranslationKey, params?: unknown[]): string;
  focusEditor(): void;
}

/** Per-item reactive overrides. All optional; default to command-derived. */
export interface ItemReactiveOverrides {
  isActive?: (api: ToolbarActionApi) => boolean;
  isDisabled?: (api: ToolbarActionApi) => boolean;
  value?: (api: ToolbarActionApi) => unknown;
  /** Contextual visibility — item stays mounted; the renderer toggles display. */
  isVisible?: (api: ToolbarActionApi) => boolean;
}

interface ToolbarItemBase extends ItemReactiveOverrides {
  id: string;
  order?: number;
  /** Office-style ribbon tab placement. Missing values default to Plugins. */
  tab?: RibbonTabId;
  /** Logical section id (used for grouping/ordering, not rendering layout). */
  group?: string;
  /** Two-row ribbon placement. Missing values default to row 1. */
  row?: RibbonRow;
  testId?: string;
  tooltipKey?: TranslationKey;
  tooltip?: string;
  iconName?: string;
}

export interface ButtonItem extends ToolbarItemBase {
  type: "button";
  /** The command this button dispatches — the only way an item acts. */
  command: CommandRef;
  labelKey?: TranslationKey;
  label?: string;
  wide?: boolean;
}

export interface ToggleItem extends ToolbarItemBase {
  type: "toggle";
  /** Toggles dispatch and derive `active` from this command (or an override). */
  command: CommandRef;
  labelKey?: TranslationKey;
  label?: string;
  wide?: boolean;
}

export type MenuContent =
  | { kind: "items"; items: ToolbarItem[] }
  | { kind: "custom"; render: (api: ToolbarActionApi) => JSX.Element };

export interface SplitItem extends ToolbarItemBase {
  type: "split";
  /** Command the main button dispatches (the chevron opens `menu`). */
  command: CommandRef;
  /** Chevron-opened content. */
  menu: MenuContent;
}

export interface MenuItem extends ToolbarItemBase {
  type: "menu";
  content: MenuContent;
  labelKey?: TranslationKey;
  label?: string;
  hideChevron?: boolean;
  keepMounted?: boolean;
  /** Extra class applied to the popover panel (e.g. "oasis-editor-toolbar-panel"). */
  panelClass?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectItem extends ToolbarItemBase {
  type: "select";
  /** Command dispatched with the chosen value as payload. */
  command: CommandRef;
  options: (api: ToolbarActionApi) => SelectOption[];
  /** Leading "empty" option label, if any (e.g. font placeholder). */
  placeholder?: string;
  width?: "wide" | "small" | "default";
}

export interface ColorPickerItem extends ToolbarItemBase {
  type: "colorPicker";
  kind: "color" | "highlight" | "shading";
  /** Command dispatched with the chosen color (or null) as payload. */
  command: CommandRef;
  palette?: ColorPalette;
  defaultValue: string;
}

export interface GridPickerItem extends ToolbarItemBase {
  type: "gridPicker";
  /** Command dispatched with `{ rows, cols }` as payload. */
  command: CommandRef;
  maxRows?: number;
  maxCols?: number;
}

export interface SeparatorItem {
  type: "separator";
  id: string;
  order?: number;
  tab?: RibbonTabId;
  group?: string;
  row?: RibbonRow;
  isVisible?: (api: ToolbarActionApi) => boolean;
}

export interface GroupItem extends ToolbarItemBase {
  type: "group";
  items: ToolbarItem[];
}

export interface CustomItem extends ToolbarItemBase {
  type: "custom";
  render: (api: ToolbarActionApi) => JSX.Element;
}

export type ToolbarItem =
  | ButtonItem
  | ToggleItem
  | SplitItem
  | MenuItem
  | SelectItem
  | ColorPickerItem
  | GridPickerItem
  | SeparatorItem
  | GroupItem
  | CustomItem;

export type ToolbarItemType = ToolbarItem["type"];

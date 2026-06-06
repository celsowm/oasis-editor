import "./styles/oasis-editor.css";

export { createOasisEditor } from "./app/bootstrap/createOasisEditorApp.js";
export type { OasisEditorInstance } from "./app/bootstrap/createOasisEditorApp.js";

export { createOasisEditorContainer } from "./app/bootstrap/createOasisEditorContainer.js";
export type { OasisEditorContainerInstance } from "./app/bootstrap/createOasisEditorContainer.js";

export { OasisEditorContainer } from "./ui/OasisEditorContainer.js";
export type { OasisEditorContainerProps } from "./ui/OasisEditorContainer.js";

export { OasisEditorAppLazy } from "./ui/OasisEditorAppLazy.js";
export { OasisEditorLoading } from "./ui/OasisEditorLoading.js";
export type { OasisEditorLoadingProps } from "./ui/OasisEditorLoading.js";
export { Editor } from "./core/Editor.js";
export { CommandRegistry } from "./core/commands/CommandRegistry.js";
export {
  commandRefName,
  resolveCommandRef,
} from "./core/commands/CommandRef.js";
export { createEditorCommandBus } from "./core/commands/CommandBus.js";
export { PluginCollection } from "./core/plugins/PluginCollection.js";
export { mount } from "./ui/mount.js";
export { DocumentShell } from "./ui/shells/DocumentShell.js";
export { InlineShell } from "./ui/shells/InlineShell.js";
export { BalloonShell } from "./ui/shells/BalloonShell.js";
export { Dialog } from "./ui/components/Dialogs/Dialog.js";
export type { DialogProps } from "./ui/components/Dialogs/Dialog.js";
export { Tabs } from "./ui/components/Tabs/Tabs.js";
export type { TabsItem, TabsProps } from "./ui/components/Tabs/Tabs.js";
export type {
  OasisPlugin,
  OasisEditor,
  OasisCommand,
  OasisCommandRegistry,
  CommandState,
  PluginReference,
  Unsubscribe,
} from "./core/plugin.js";
export type {
  CommandRef,
  ResolvedCommandRef,
} from "./core/commands/CommandRef.js";
export type { CommandBus } from "./core/commands/CommandBus.js";

// ---------------------------------------------------------------------------
// Toolbar subsystem — public, client-extensible API
// ---------------------------------------------------------------------------
export type {
  OasisEditorAppProps,
  ToolbarLayoutMode,
} from "./ui/OasisEditorApp.js";

export type {
  ToolbarItem,
  ToolbarItemType,
  ButtonItem,
  ToggleItem,
  SplitItem,
  MenuItem,
  MenuContent,
  SelectItem,
  SelectOption,
  ColorPickerItem,
  GridPickerItem,
  SeparatorItem,
  GroupItem,
  CustomItem,
  ToolbarActionApi,
  ToolbarCommandState,
  ItemReactiveOverrides,
} from "./ui/components/Toolbar/schema/items.js";
export type {
  ColorPalette,
  ColorSwatch,
  ThemeColor,
} from "./ui/components/Toolbar/schema/palette.js";

export { createToolbarRegistry } from "./ui/components/Toolbar/registry/ToolbarRegistry.js";
export type {
  ToolbarMoveTarget,
  ToolbarRegistry,
} from "./ui/components/Toolbar/registry/ToolbarRegistry.js";

export { DEFAULT_PALETTE } from "./ui/components/Toolbar/presets/defaultPalette.js";
export { createDefaultToolbarPreset } from "./ui/components/Toolbar/presets/defaultToolbar.js";

export { Toolbar } from "./ui/components/Toolbar/Toolbar.js";
export type { ToolbarProps } from "./ui/components/Toolbar/Toolbar.js";

export { registerToolbarRenderer } from "./ui/components/Toolbar/renderers/renderers.js";
export type { RendererProps } from "./ui/components/Toolbar/renderers/renderers.js";

// Toolbar UI primitives — for building custom controls consistent with built-ins.
export { Popover } from "./ui/components/Toolbar/primitives/Popover.js";
export type { PopoverProps } from "./ui/components/Toolbar/primitives/Popover.js";
export { Menu as ToolbarMenu } from "./ui/components/Toolbar/primitives/Menu.js";
export { Button as ToolbarButton } from "./ui/components/Toolbar/primitives/Button.js";
export { Select as ToolbarSelect } from "./ui/components/Toolbar/primitives/Select.js";
export { Separator as ToolbarSeparator } from "./ui/components/Toolbar/primitives/Separator.js";
export { SplitButton as ToolbarSplitButton } from "./ui/components/Toolbar/primitives/SplitButton.js";
export { ColorPicker as ToolbarColorPicker } from "./ui/components/Toolbar/primitives/ColorPicker.js";
export { GridPicker as ToolbarGridPicker } from "./ui/components/Toolbar/primitives/GridPicker.js";

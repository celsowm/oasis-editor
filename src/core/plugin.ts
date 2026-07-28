import type { JSX } from "solid-js";
import type { EditorState } from "./model.js";
import type { CommandRef } from "./commands/CommandRef.js";
import type {
  RibbonGroupResizePolicy,
  RibbonRow,
  RibbonSize,
  RibbonTabId,
} from "./pluginUiTypes.js";

/** Function signature for unsubscribing from a subscription. */
export type Unsubscribe = () => void;

/** Context passed to command execution and refresh callbacks. */
export interface OasisCommandContext {
  editor: OasisEditor;
  commands: OasisCommandRegistry;
  ui: OasisPluginUiRegistry;
  getState(): EditorState;
  getDocument(): EditorState["document"];
  getSelection(): EditorState["selection"];
}

/**
 * A single command — an action that can be executed and optionally refreshed for state.
 * @typeParam TPayload - The command's payload type.
 * @typeParam TResult - The command's result type.
 */
export interface OasisCommand<TPayload = unknown, TResult = unknown> {
  execute: (payload?: TPayload, context?: OasisCommandContext) => TResult;
  refresh?: (payload?: TPayload, context?: OasisCommandContext) => CommandState;
}

/** Registry for named commands, providing register, lookup, execution, and state queries. */
export interface OasisCommandRegistry {
  /**
   * Registers a command by name.
   * @param name - The command name.
   * @param command - The command implementation.
   */
  register: <TPayload = unknown, TResult = unknown>(
    name: string,
    command: OasisCommand<TPayload, TResult>,
  ) => void;
  /** @param name - The command name to unregister. */
  unregister: (name: string) => void;
  /**
   * @param name - The command name.
   * @returns The command implementation, or undefined.
   */
  get: (name: string) => OasisCommand | undefined;
  /**
   * @param name - The command name.
   * @returns Whether the command is registered.
   */
  has: (name: string) => boolean;
  /**
   * Executes a registered command.
   * @param name - The command name.
   * @param payload - Optional payload.
   * @returns The command's result.
   */
  execute: <TPayload = unknown, TResult = unknown>(
    name: string,
    payload?: TPayload,
  ) => TResult;
  /**
   * @param name - The command name.
   * @param payload - Optional payload.
   * @returns Whether the command can execute in the current state.
   */
  canExecute: (name: string, payload?: unknown) => boolean;
  /**
   * @param name - The command name.
   * @param payload - Optional payload.
   * @returns The command's reactive state.
   */
  state: (name: string, payload?: unknown) => CommandState;
}

/** Reactive state of a command: whether it is enabled, active, and any associated value. */
export interface CommandState {
  isEnabled: boolean;
  isActive?: boolean;
  value?: unknown;
}

/** Core editor interface exposed to plugins and the runtime. */
export interface OasisEditor {
  readonly state: EditorState;
  readonly commands: OasisCommandRegistry;
  readonly ui: OasisPluginUiRegistry;
  on: (event: string, callback: (...args: unknown[]) => void) => Unsubscribe;
  once: (event: string, callback: (...args: unknown[]) => void) => Unsubscribe;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

/** A plugin reference — either a plugin name string or a plugin instance. */
export type PluginReference = string | OasisPlugin;

/**
 * Toolbar/menu contribution descriptor. Contributions dispatch exclusively
 * through the command registry — register the command in `commands`, then
 * reference it here by name. There is no inline-callback escape hatch.
 */
export interface PluginAction {
  id: string;
  command: CommandRef;
  icon?: string;
  tab?: RibbonTabId;
  group?: string;
  row?: RibbonRow;
  ribbonSize?: RibbonSize;
  ribbonGroupResize?: RibbonGroupResizePolicy;
  order?: number;
}

/** Menu item contribution extending {@link PluginAction} with path, shortcut, and separator. */
export interface PluginMenuItem extends PluginAction {
  path: string;
  shortcut?: string;
  separator?: boolean;
  labelKey?: string;
}

/** Whether a floating action is scoped to the editor container or the viewport. */
export type FloatingActionScope = "container" | "viewport";

/** Placement options for floating action buttons. */
export type FloatingActionPlacement =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

/** Contribution descriptor for a floating action button. */
export interface FloatingActionContribution extends PluginAction {
  label?: string;
  labelKey?: string;
  tooltip?: string;
  scope?: FloatingActionScope;
  placement?: FloatingActionPlacement;
  order?: number;
}

/** How a side panel is displayed: docked alongside the editor or overlaid on top. */
export type SidePanelMode = "dock" | "overlay";

/** Extended render context passed to UI contributions. */
export interface PluginUiRenderContext extends OasisCommandContext {
  panelId?: string;
  closePanel?: () => void;
}

/** Contribution descriptor for a side panel added by a plugin. */
export interface SidePanelContribution {
  id: string;
  title: string;
  titleKey?: string;
  icon?: string;
  mode?: SidePanelMode;
  width?: number | string;
  order?: number;
  render: (context: PluginUiRenderContext) => JSX.Element;
}

/** UI contributions a plugin can provide: floating actions and side panels. */
export interface OasisPluginUiContributions {
  floatingActions?: FloatingActionContribution[];
  sidePanels?: SidePanelContribution[];
}

/** Snapshot of the current plugin UI state. */
export interface OasisPluginUiSnapshot {
  floatingActions: FloatingActionContribution[];
  sidePanels: SidePanelContribution[];
  activeSidePanelId: string | null;
}

/** Registry for plugin-contributed UI elements. */
export interface OasisPluginUiRegistry {
  registerFloatingAction(contribution: FloatingActionContribution): Unsubscribe;
  registerSidePanel(contribution: SidePanelContribution): Unsubscribe;
  openSidePanel(id: string): void;
  closeSidePanel(id?: string): void;
  toggleSidePanel(id: string): void;
  getSnapshot(): OasisPluginUiSnapshot;
  onChange(callback: () => void): Unsubscribe;
}

/**
 * An Oasis editor plugin. Plugins extend the editor with custom commands,
 * keymaps, toolbar items, menu items, and UI contributions.
 */
export interface OasisPlugin {
  name: string;
  requires?: PluginReference[];
  schema?: {
    nodes?: Record<string, unknown>;
    marks?: Record<string, unknown>;
  };
  commands?: Record<string, OasisCommand>;
  keymaps?: Array<{ key: string; command: string }>;
  toolbar?: PluginAction[];
  menubar?: PluginMenuItem[];
  ui?: OasisPluginUiContributions;
  init?: (editor: OasisEditor) => void | Promise<void>;
  afterInit?: (editor: OasisEditor) => void | Promise<void>;
  destroy?: (editor: OasisEditor) => void | Promise<void>;
  install?: (editor: OasisEditor) => void | Unsubscribe;
}

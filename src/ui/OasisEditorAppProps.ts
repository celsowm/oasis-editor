import type { JSX } from "solid-js";
import type { EditorDocument, EditorState } from "@/core/model.js";
import type { ToolbarRegistry } from "./components/Toolbar/registry/ToolbarRegistry.js";
import type { MenuRegistry } from "./components/Menubar/menuRegistry.js";
import type { DocumentPersistence } from "@/app/controllers/useEditorPersistence.js";
import type { OasisPlugin } from "@/core/plugin.js";
import type {
  OasisEditorClient,
  OasisEditorClientController,
} from "@/app/client/OasisEditorClient.js";

/** Toolbar display mode. */
export type ToolbarViewMode = "ribbon" | "compact";

/** Toolbar overflow behavior. */
export type ToolbarLayoutMode = "overflow" | "wrap";

/** Options for the loading overlay shown during editor startup. */
export interface OasisEditorLoadingOptions {
  label?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** UI configuration properties for the editor app. */
export interface OasisEditorAppUiProps {
  theme?: "light" | "dark";
  showChrome?: boolean;
  shell?: "document" | "inline" | "balloon";
  uiVariant?: "classic" | "docs";
  toolbar?: {
    view?: ToolbarViewMode;
    layout?: ToolbarLayoutMode;
  };
  showTitleBar?: boolean;
  showMenubar?: boolean;
  showToolbar?: boolean;
  showOutline?: boolean;
  locale?: "pt-BR" | "en";
  viewportHeight?: number | string;
  class?: string;
  style?: JSX.CSSProperties;
  loading?: boolean | OasisEditorLoadingOptions;
}

/** Document-related configuration properties for the editor app. */
export interface OasisEditorAppDocumentProps {
  initialDocument?: EditorDocument;
  initialState?: EditorState;
  remoteWebFonts?: boolean;
  onStateChange?: (state: EditorState) => void;
  readOnly?: boolean;
  persistenceEnabled?: boolean;
  persistence?: DocumentPersistence;
  /**
   * Storage key for the built-in IndexedDB persistence. Two editors on the same
   * page must use distinct keys to avoid overwriting each other's document.
   * Ignored when a custom `persistence` is provided.
   */
  persistenceKey?: string;
}

/** Runtime configuration properties for the editor app (plugins, customization). */
export interface OasisEditorAppRuntimeProps {
  onReady?: (client: OasisEditorClient) => void;
  plugins?: OasisPlugin[];
  /** @internal Used by createOasisEditor()/mount() to bind the public client. */
  client?: OasisEditorClientController;
  /**
   * Customize the toolbar after the built-in preset and plugin contributions
   * load. Use the registry to add/insert/replace/remove/move items.
   */
  customizeToolbar?: (registry: ToolbarRegistry) => void;
  customizeMenubar?: (registry: MenuRegistry) => void;
}

/** Top-level configuration props for the Oasis editor application. */
export interface OasisEditorAppProps {
  ui?: OasisEditorAppUiProps;
  document?: OasisEditorAppDocumentProps;
  runtime?: OasisEditorAppRuntimeProps;
}

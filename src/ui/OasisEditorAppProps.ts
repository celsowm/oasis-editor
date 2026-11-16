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
    /**
     * Ribbon density. `simplified` is Office's one-line ribbon: the tabs stay,
     * each panel is a single row of small commands with no group captions, and
     * groups that do not fit open as popups. Meant for embedded editors (form
     * fields) where the ~90px classic ribbon costs too much height.
     */
    ribbonStyle?: "classic" | "simplified";
  };
  showTitleBar?: boolean;
  showMenubar?: boolean;
  showToolbar?: boolean;
  showOutline?: boolean;
  /** Horizontal ruler above the page (document shell). Defaults to `showChrome`. */
  showRuler?: boolean;
  /**
   * First-run welcome dialog (precise local fonts offer). Defaults to `true`;
   * embedded hosts (e.g. a form field) can turn it off.
   */
  showWelcome?: boolean;
  locale?: "pt-BR" | "en";
  /** Espaço externo em pixels ao redor das páginas; não altera as margens do documento. Padrão preservado quando omitido. */
  pageGutter?: number;
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

/**
 * Optional host-supplied review identity. Undefined retains standalone editor
 * behavior; configured identities require stable ids for owner-only actions.
 *
 * Authorization here is UI/client defense-in-depth, not a server security
 * boundary. A collaborative backend must independently enforce the same policy.
 */
export type { OasisReviewAccess } from "@/core/commands/commentPermissions.js";
import type { OasisReviewAccess } from "@/core/commands/commentPermissions.js";

/** Runtime configuration properties for the editor app (plugins, customization). */
export interface OasisEditorAppRuntimeProps {
  onReady?: (client: OasisEditorClient) => void;
  plugins?: OasisPlugin[];
  /** Restrict comment mutation to the authenticated host identity. */
  review?: OasisReviewAccess;
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

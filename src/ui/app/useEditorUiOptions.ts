import { DocumentShell } from "@/ui/shells/DocumentShell.js";
import { InlineShell } from "@/ui/shells/InlineShell.js";
import { BalloonShell } from "@/ui/shells/BalloonShell.js";
import type {
  OasisEditorAppDocumentProps,
  OasisEditorAppUiProps,
  OasisEditorLoadingOptions,
  ToolbarViewMode,
  ToolbarLayoutMode,
} from "@/ui/OasisEditorAppProps.js";

export interface EditorUiOptionsContext {
  ui: () => OasisEditorAppUiProps;
  documentOptions: () => OasisEditorAppDocumentProps;
}

export interface EditorUiOptions {
  showChrome: () => boolean;
  showTitleBar: () => boolean;
  showMenubar: () => boolean;
  showToolbar: () => boolean;
  showOutline: () => boolean;
  toolbarView: () => ToolbarViewMode;
  toolbarLayout: () => ToolbarLayoutMode;
  isReadOnly: () => boolean;
  useComposedShell: () => boolean;
  loadingOptions: () => OasisEditorLoadingOptions | undefined;
  loadingLabel: () => string;
  shellComponent: () =>
    | typeof DocumentShell
    | typeof InlineShell
    | typeof BalloonShell;
}

/**
 * Resolves the editor's UI/document option accessors, applying defaults in one
 * place so the composition root doesn't carry a dozen `?? default` getters.
 */
export function createEditorUiOptions(
  ctx: EditorUiOptionsContext,
): EditorUiOptions {
  const { ui, documentOptions } = ctx;

  const loadingOptions = (): OasisEditorLoadingOptions | undefined => {
    const loading = ui().loading;
    return typeof loading === "object" && loading !== null
      ? loading
      : undefined;
  };

  return {
    showChrome: (): boolean => ui().showChrome ?? true,
    showTitleBar: (): boolean => ui().showTitleBar ?? true,
    showMenubar: (): boolean => ui().showMenubar ?? true,
    showToolbar: (): boolean => ui().showToolbar ?? true,
    showOutline: (): boolean => ui().showOutline ?? true,
    toolbarView: (): ToolbarViewMode => ui().toolbar?.view ?? "ribbon",
    toolbarLayout: (): ToolbarLayoutMode => ui().toolbar?.layout ?? "overflow",
    isReadOnly: (): boolean => documentOptions().readOnly ?? false,
    useComposedShell: (): boolean =>
      ui().uiVariant === "docs" || (ui().shell ?? "document") !== "document",
    loadingOptions,
    loadingLabel: (): string =>
      loadingOptions()?.label ?? "Loading oasis-editor...",
    shellComponent: ():
      | typeof DocumentShell
      | typeof InlineShell
      | typeof BalloonShell => {
      const s = ui().shell ?? "document";
      if (s === "inline") return InlineShell;
      if (s === "balloon") return BalloonShell;
      return DocumentShell;
    },
  };
}

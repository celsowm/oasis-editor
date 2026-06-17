import { DocumentShell } from "@/ui/shells/DocumentShell.js";
import { InlineShell } from "@/ui/shells/InlineShell.js";
import { BalloonShell } from "@/ui/shells/BalloonShell.js";
import type {
  OasisEditorAppDocumentProps,
  OasisEditorAppUiProps,
  OasisEditorLoadingOptions,
} from "@/ui/OasisEditorAppProps.js";

export interface EditorUiOptionsContext {
  ui: () => OasisEditorAppUiProps;
  documentOptions: () => OasisEditorAppDocumentProps;
}

/**
 * Resolves the editor's UI/document option accessors, applying defaults in one
 * place so the composition root doesn't carry a dozen `?? default` getters.
 */
export function createEditorUiOptions(ctx: EditorUiOptionsContext) {
  const { ui, documentOptions } = ctx;

  const loadingOptions = (): OasisEditorLoadingOptions | undefined => {
    const loading = ui().loading;
    return typeof loading === "object" && loading !== null
      ? loading
      : undefined;
  };

  return {
    showChrome: () => ui().showChrome ?? true,
    showTitleBar: () => ui().showTitleBar ?? true,
    showMenubar: () => ui().showMenubar ?? true,
    showToolbar: () => ui().showToolbar ?? true,
    showOutline: () => ui().showOutline ?? true,
    toolbarView: () => ui().toolbar?.view ?? "ribbon",
    toolbarLayout: () => ui().toolbar?.layout ?? "overflow",
    isReadOnly: () => documentOptions().readOnly ?? false,
    useComposedShell: () =>
      ui().uiVariant === "docs" || (ui().shell ?? "document") !== "document",
    loadingOptions,
    loadingLabel: () => loadingOptions()?.label ?? "Loading oasis-editor...",
    shellComponent: () => {
      const s = ui().shell ?? "document";
      if (s === "inline") return InlineShell;
      if (s === "balloon") return BalloonShell;
      return DocumentShell;
    },
  };
}

import { onCleanup, onMount } from "solid-js";
import { createEditorEssentialsRuntimePlugin } from "./createEditorEssentialsPlugin.js";
import { useEditorRuntimePlugins } from "./useEditorRuntimePlugins.js";
import { createRuntimeCommandHost } from "./createRuntimeCommandHost.js";

type EssentialsPluginDeps = Parameters<
  typeof createEditorEssentialsRuntimePlugin
>[0];
type RuntimePluginsConfig = Parameters<typeof useEditorRuntimePlugins>[0];
type RuntimeCommandHostConfig = Parameters<typeof createRuntimeCommandHost>[0];
type RuntimeCommandHost = ReturnType<typeof createRuntimeCommandHost>;

/**
 * Bootstraps the plugin runtime: it builds the Essentials plugin, registers all
 * runtime plugins / the toolbar registry, spins up the command host and owns the
 * runtime's mount (initialize) and cleanup (dispose) lifecycle. The composition
 * root only feeds the already-built controllers in and consumes the host facade.
 */
export interface EditorRuntimeBootstrapContext {
  essentials: EssentialsPluginDeps;
  externalPlugins: RuntimePluginsConfig["externalPlugins"];
  customizeToolbar: RuntimePluginsConfig["customizeToolbar"];
  customizeMenubar: RuntimePluginsConfig["customizeMenubar"];
  initialDocument: RuntimeCommandHostConfig["initialDocument"];
  focusEditor: RuntimeCommandHostConfig["focusEditor"];
  logger: RuntimeCommandHostConfig["logger"];
  onReady: RuntimeCommandHostConfig["onReady"];
  onSettled: RuntimeCommandHostConfig["onSettled"];
  onError?: RuntimeCommandHostConfig["onError"];
}

export interface EditorRuntimeBootstrap {
  toolbarRegistry: ReturnType<
    typeof useEditorRuntimePlugins
  >["toolbarRegistry"];
  menuRegistry: ReturnType<typeof useEditorRuntimePlugins>["menuRegistry"];
  runtimeReady: RuntimeCommandHost["runtimeReady"];
  runtimeEditor: RuntimeCommandHost["runtimeEditor"];
  commandStateOf: RuntimeCommandHost["commandStateOf"];
  toolbarHost: RuntimeCommandHost["toolbarHost"];
}

export function useEditorRuntimeBootstrap(
  ctx: EditorRuntimeBootstrapContext,
): EditorRuntimeBootstrap {
  const essentialsPlugin = createEditorEssentialsRuntimePlugin(ctx.essentials);

  const {
    runtimePlugins,
    toolbarRegistry,
    menuRegistry,
    dispose: disposeRuntimePlugins,
  } = useEditorRuntimePlugins({
    essentialsPlugin,
    externalPlugins: ctx.externalPlugins,
    customizeToolbar: ctx.customizeToolbar,
    customizeMenubar: ctx.customizeMenubar,
  });

  const runtimeCommandHost = createRuntimeCommandHost({
    initialDocument: ctx.initialDocument,
    runtimePlugins,
    focusEditor: ctx.focusEditor,
    logger: ctx.logger,
    onReady: ctx.onReady,
    onSettled: ctx.onSettled,
    onError: ctx.onError,
  });

  onMount(() => {
    void runtimeCommandHost.initialize();
  });

  onCleanup(() => {
    void runtimeCommandHost.dispose();
    disposeRuntimePlugins();
  });

  return {
    toolbarRegistry,
    menuRegistry,
    runtimeReady: runtimeCommandHost.runtimeReady,
    runtimeEditor: runtimeCommandHost.runtimeEditor,
    commandStateOf: runtimeCommandHost.commandStateOf,
    toolbarHost: runtimeCommandHost.toolbarHost,
  };
}

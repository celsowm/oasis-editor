import { createSignal, type Accessor } from "solid-js";
import { Editor } from "@/core/Editor.js";
import {
  commandRefName,
  resolveCommandRef,
  type CommandRef,
} from "@/core/commands/CommandRef.js";
import type { EditorDocument } from "@/core/model.js";
import type { OasisPlugin } from "@/core/plugin.js";
import type { ToolbarHost } from "@/ui/components/Toolbar/state/createToolbarApi.js";
import type { EditorLogger } from "@/utils/logger.js";

interface CreateRuntimeCommandHostOptions {
  initialDocument: EditorDocument;
  runtimePlugins: OasisPlugin[];
  focusEditor: () => void;
  logger: EditorLogger;
  onReady?: (editor: Editor) => void;
  onSettled?: () => void;
  onError?: (error: unknown) => void;
}

export function createRuntimeCommandHost(
  options: CreateRuntimeCommandHostOptions,
): {
  runtimeReady: Accessor<boolean>;
  runtimeEditor: Accessor<Editor>;
  commandStateOf: (commandRef: CommandRef) => {
    isEnabled: boolean;
    isActive: boolean;
    value: unknown;
  };
  toolbarHost: () => ToolbarHost;
  initialize: () => Promise<void>;
  dispose: () => Promise<void>;
} {
  const [runtimeReady, setRuntimeReady] = createSignal(false);
  const [runtimeEditor, setRuntimeEditor] = createSignal(
    new Editor({
      doc: options.initialDocument,
      plugins: [],
    }),
  );
  let disposed = false;

  const commandStateOf = (commandRef: CommandRef) => {
    const commandName = commandRefName(commandRef);
    const cmd = runtimeEditor().commands.get(commandName);
    if (!cmd) {
      return { isEnabled: false, isActive: false, value: undefined };
    }
    const refreshed = cmd.refresh?.() ?? { isEnabled: true };
    return {
      isEnabled: refreshed.isEnabled !== false,
      isActive: Boolean(refreshed.isActive),
      value: refreshed.value,
    };
  };

  const toolbarHost = (): ToolbarHost => ({
    commands: {
      execute: (command, payload) => {
        const resolved = resolveCommandRef(command, payload);
        return runtimeEditor().commands.execute(
          resolved.name,
          resolved.payload,
        );
      },
      canExecute: (command, payload) => {
        const resolved = resolveCommandRef(command, payload);
        return runtimeEditor().commands.canExecute(
          resolved.name,
          resolved.payload,
        );
      },
      state: commandStateOf,
    },
    focusEditor: options.focusEditor,
  });

  const initialize = async () => {
    try {
      const initializedRuntimeEditor = await Editor.create({
        doc: options.initialDocument,
        plugins: options.runtimePlugins,
      });
      if (disposed) {
        await initializedRuntimeEditor.destroy();
        return;
      }

      const previousRuntimeEditor = runtimeEditor();
      setRuntimeEditor(initializedRuntimeEditor);
      await previousRuntimeEditor.destroy();
      setRuntimeReady(true);

      requestAnimationFrame(() => {
        options.onSettled?.();
        options.onReady?.(initializedRuntimeEditor);
      });
    } catch (error) {
      options.logger.error("runtime:init failed", error);
      options.onError?.(error);
      options.onSettled?.();
    }
  };

  const dispose = async () => {
    disposed = true;
    await runtimeEditor().destroy();
  };

  return {
    runtimeReady,
    runtimeEditor,
    commandStateOf,
    toolbarHost,
    initialize,
    dispose,
  };
}

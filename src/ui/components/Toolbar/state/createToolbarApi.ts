import type { TranslateFn } from "@/i18n/index.js";
import type { CommandBus } from "@/core/commands/CommandBus.js";
import type {
  ToolbarActionApi,
  ToolbarCommandState,
} from "@/ui/components/Toolbar/schema/items.js";

/**
 * Narrow host the toolbar needs from its embedding editor: the command registry
 * and focus. There is no god context and no out-of-band editor read.
 */
export interface ToolbarHost {
  commands: CommandBus<ToolbarCommandState>;
  focusEditor(): void;
}

/**
 * Builds the {@link ToolbarActionApi} from the narrow {@link ToolbarHost}.
 * @param host - A function returning the current toolbar host.
 * @param t - The translation function.
 * @returns A new ToolbarActionApi.
 */
export function createToolbarApi(
  host: () => ToolbarHost,
  t: TranslateFn,
): ToolbarActionApi {
  return {
    commands: host().commands,
    t,
    focusEditor: (): void => host().focusEditor(),
  };
}

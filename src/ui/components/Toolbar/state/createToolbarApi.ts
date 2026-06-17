import { t } from "@/i18n/index.js";
import type { CommandBus } from "@/core/commands/CommandBus.js";
import type { ToolbarActionApi, ToolbarCommandState } from "@/ui/components/Toolbar/schema/items.js";

/**
 * Narrow host the toolbar needs from its embedding editor: nothing but the
 * command registry — dispatch operations and observe their reactive state.
 * There is no god context and no out-of-band editor read.
 */
export interface ToolbarHost {
  commands: CommandBus<ToolbarCommandState>;
  focusEditor(): void;
}

/** Builds the {@link ToolbarActionApi} from the narrow {@link ToolbarHost}. */
export function createToolbarApi(host: () => ToolbarHost): ToolbarActionApi {
  return {
    commands: host().commands,
    t,
    focusEditor: () => host().focusEditor(),
  };
}

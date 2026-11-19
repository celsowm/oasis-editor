import {
  insertDateField,
  insertDateTimeText,
} from "@/core/commands/fieldDate.js";
import { refreshBodyFieldCaches } from "@/layoutProjection/bodyFieldCacheRefresh.js";
import { getActiveZone } from "@/core/model.js";
import { insertCrossReference } from "@/core/commands/crossReference.js";
import type { EssentialsFieldsCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

/**
 * Field authoring capability: bridges the core field commands onto the
 * editor's transactional state pipeline so inserting DATE/TIME fields enters
 * the undo/redo history like other document mutations. The field is inserted
 * at the active caret in whatever zone it sits (header, footer or body).
 */
export function buildEssentialsFields(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsFieldsCapability {
  return {
    updateBodyFields: (): void => {
      if (options.isReadOnly() || getActiveZone(options.state()) !== "main" ||
          options.state().trackChangesEnabled) return;
      options.resetTransactionGrouping();
      options.applyTransactionalState(state => refreshBodyFieldCaches(state).state);
      options.clearPreferredColumn();
      options.focusInput();
    },
    insertDate: (): void => {
      options.applyTransactionalState((state) => insertDateField(state));
      options.focusInput();
    },
    insertDateTime: (dateFormat): void => {
      options.applyTransactionalState((state) =>
        insertDateTimeText(state, dateFormat),
      );
      options.focusInput();
    },
    insertCrossReference: (xr): void => {
      options.applyTransactionalState((state) =>
        insertCrossReference(state, xr),
      );
      options.focusInput();
    },
  };
}

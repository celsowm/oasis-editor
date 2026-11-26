import {
  insertDateField,
  insertDateTimeText,
} from "@/core/commands/fieldDate.js";
import { refreshBodyFieldCaches } from "@/layoutProjection/bodyFieldCacheRefresh.js";
import { getActiveZone } from "@/core/model.js";
import {markIndexEntry,insertIndex,updateIndex,canMarkIndexEntry,canInsertIndex,canUpdateIndex} from "@/core/commands/indexEntries.js";
import type {EditorState} from "@/core/model.js";
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
  const canUpdateBodyFields = (): boolean => !options.isReadOnly() &&
    getActiveZone(options.state()) === "main" && !options.state().trackChangesEnabled;
  const update = (scope: "all" | "selection"): void => {
    if (!canUpdateBodyFields()) return;
    options.resetTransactionGrouping();
    // Capture a single instant for the entire convergent transaction.
    const temporal={now:Date.now(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone};
    options.applyTransactionalState(state => refreshBodyFieldCaches(state, undefined, scope, temporal).state);
    options.clearPreferredColumn();
    options.focusInput();
  };
  const mutateIndex=(can:(s:EditorState)=>boolean,produce:(s:EditorState)=>EditorState):boolean=>{
    if(options.isReadOnly()||!can(options.state()))return false;
    let changed=false;
    options.resetTransactionGrouping();
    options.applyTransactionalState(state=>{
      if(options.isReadOnly()||!can(state))return state;
      const next=produce(state);
      changed=next!==state;
      return next;
    });
    if(changed){options.clearPreferredColumn();options.focusInput();}
    return changed;
  };
  return {
    canMarkIndexEntry:()=>!options.isReadOnly()&&canMarkIndexEntry(options.state()),
    canInsertIndex:()=>!options.isReadOnly()&&canInsertIndex(options.state()),
    canUpdateIndex:()=>!options.isReadOnly()&&canUpdateIndex(options.state()),
    markIndexEntry:p=>mutateIndex(canMarkIndexEntry,s=>markIndexEntry(s,p)),
    insertIndex:p=>mutateIndex(canInsertIndex,s=>insertIndex(s,p)),
    updateIndex:locale=>mutateIndex(canUpdateIndex,s=>updateIndex(s,locale)),
    canUpdateBodyFields,
    updateBodyFields: () => update("all"),
    updateSelectedFields: () => update("selection"),
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

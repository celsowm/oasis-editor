import {
  insertDateField,
  insertDateTimeText,
} from "@/core/commands/fieldDate.js";
import { refreshBodyFieldCaches } from "@/layoutProjection/bodyFieldCacheRefresh.js";
import { getActiveZone } from "@/core/model.js";
import {
  markIndexEntry,
  insertIndex,
  updateIndex,
  canMarkIndexEntry,
  canInsertIndex,
  canUpdateIndex,
} from "@/core/commands/indexEntries.js";
import type { EditorState } from "@/core/model.js";
import {
  editFieldCode,
  findFieldInstructionAtSelection,
  insertFieldCode,
  navigateFields,
  setShowFieldCodes,
  toggleFieldLock,
} from "@/core/commands/fieldCode.js";
import {
  insertTableOfAuthorities,
  markAuthorityEntry,
  updateTableOfAuthorities,
} from "@/core/commands/tableOfAuthorities.js";
import {
  insertTableOfFigures,
  updateTableOfFigures,
} from "@/core/commands/tableOfFigures.js";
import {
  mergeToNewDocuments,
  previewMergeRecord,
} from "@/core/commands/mailMerge.js";
import { refreshVariableFieldCaches } from "@/core/document/variableFields.js";
import {
  setFormFieldValue,
  toggleFormCheckbox,
} from "@/core/commands/legacyForms.js";
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
  const canUpdateBodyFields = (): boolean =>
    !options.isReadOnly() &&
    getActiveZone(options.state()) === "main" &&
    !options.state().trackChangesEnabled;
  const update = (scope: "all" | "selection"): void => {
    if (!canUpdateBodyFields()) return;
    options.resetTransactionGrouping();
    // Capture a single instant for the entire convergent transaction.
    const temporal = {
      now: Date.now(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    options.applyTransactionalState(
      (state) =>
        refreshBodyFieldCaches(state, undefined, scope, temporal).state,
    );
    options.clearPreferredColumn();
    options.focusInput();
  };
  const mutateIndex = (
    can: (s: EditorState) => boolean,
    produce: (s: EditorState) => EditorState,
  ): boolean => {
    if (options.isReadOnly() || !can(options.state())) return false;
    let changed = false;
    options.resetTransactionGrouping();
    options.applyTransactionalState((state) => {
      if (options.isReadOnly() || !can(state)) return state;
      const next = produce(state);
      changed = next !== state;
      return next;
    });
    if (changed) {
      options.clearPreferredColumn();
      options.focusInput();
    }
    return changed;
  };
  const mutateField = (
    produce: (state: EditorState) => EditorState,
  ): boolean => {
    if (options.isReadOnly()) return false;
    let changed = false;
    options.resetTransactionGrouping();
    options.applyTransactionalState((state) => {
      const next = produce(state);
      changed = next !== state;
      return next;
    });
    if (changed) {
      options.clearPreferredColumn();
      options.focusInput();
    }
    return changed;
  };
  return {
    canMarkIndexEntry: () =>
      !options.isReadOnly() && canMarkIndexEntry(options.state()),
    canInsertIndex: () =>
      !options.isReadOnly() && canInsertIndex(options.state()),
    canUpdateIndex: () =>
      !options.isReadOnly() && canUpdateIndex(options.state()),
    markIndexEntry: (p) =>
      mutateIndex(canMarkIndexEntry, (s) => markIndexEntry(s, p)),
    insertIndex: (p) => mutateIndex(canInsertIndex, (s) => insertIndex(s, p)),
    updateIndex: (locale) =>
      mutateIndex(canUpdateIndex, (s) => updateIndex(s, locale)),
    canUpdateBodyFields,
    updateBodyFields: () => update("all"),
    updateSelectedFields: () => update("selection"),
    insertFieldCode: (code) => mutateField((s) => insertFieldCode(s, code)),
    editFieldCode: (id, code) => mutateField((s) => editFieldCode(s, id, code)),
    editFieldCodeAtSelection: (code) =>
      mutateField((s) => {
        const id = findFieldInstructionAtSelection(s);
        return id ? editFieldCode(s, id, code) : s;
      }),
    toggleFieldLock: (id) => mutateField((s) => toggleFieldLock(s, id)),
    toggleFieldCodes: (show) =>
      options.applyState(setShowFieldCodes(options.state(), show)),
    navigateField: (direction) =>
      options.applyState(navigateFields(options.state(), direction)),
    markAuthorityEntry: (payload) =>
      mutateField((s) => markAuthorityEntry(s, payload)),
    insertTableOfAuthorities: (payload) =>
      mutateField((s) => insertTableOfAuthorities(s, payload)),
    updateTableOfAuthorities: (locale) =>
      mutateField((s) => updateTableOfAuthorities(s, locale)),
    insertTableOfFigures: (payload) =>
      mutateField((s) => insertTableOfFigures(s, payload)),
    updateTableOfFigures: () => mutateField((s) => updateTableOfFigures(s)),
    previewMergeRecord: (records, index) =>
      mutateField((s) => previewMergeRecord(s, records, index)),
    mergeToNewDocuments: (records) =>
      mergeToNewDocuments(options.state(), records)?.length ?? 0,
    updateVariableFields: () => {
      let changed = false;
      options.applyTransactionalState((state) => {
        const prompt = (
          message: string,
          defaultValue?: string,
        ): string | undefined =>
          typeof window === "undefined"
            ? undefined
            : (window.prompt(message, defaultValue ?? "") ?? undefined);
        const result = refreshVariableFieldCaches(state, { prompt });
        changed = result.updated > 0;
        return result.state;
      });
      return changed;
    },
    setFormFieldValue: (name, value) =>
      mutateField((s) => setFormFieldValue(s, name, value)),
    toggleFormCheckbox: (name) =>
      mutateField((s) => toggleFormCheckbox(s, name)),
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

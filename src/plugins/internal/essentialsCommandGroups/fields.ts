import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type {
  MarkIndexEntryOptions,
  InsertIndexOptions,
} from "@/core/commands/indexEntries.js";
import type { OasisPlugin } from "@/core/plugin.js";
import type { ActionCommandBuilder } from "../essentialsCommandBuilders.js";
import type { EssentialsFieldsCapability } from "../essentialsCapabilities.js";

interface FieldsGroupDeps {
  fields: EssentialsFieldsCapability;
  actionCommand: ActionCommandBuilder;
}

export function buildFieldsCommands({
  fields,
  actionCommand,
}: FieldsGroupDeps): NonNullable<OasisPlugin["commands"]> {
  // Retain the actual mutation result instead of actionCommand's unconditional
  // true, so a refused or unchanged edit is observable to API consumers.
  const indexCommand = (
    name: OasisBuiltinCommand,
    can: () => boolean,
    execute: (p: unknown) => boolean,
  ) => {
    const base = actionCommand(
      name,
      () => {},
      () => ({ isEnabled: can() }),
    );
    return {
      ...base,
      execute: (p?: unknown) =>
        base.refresh?.().isEnabled !== false && execute(p),
    };
  };
  return {
    markIndexEntry: indexCommand(
      "markIndexEntry",
      () => !!fields.markIndexEntry && !!fields.canMarkIndexEntry?.(),
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as Partial<MarkIndexEntryOptions>;
        if (
          !Array.isArray(v.path) ||
          !v.path.every((x) => typeof x === "string") ||
          (v.identifier !== undefined && typeof v.identifier !== "string") ||
          (v.boldPage !== undefined && typeof v.boldPage !== "boolean") ||
          (v.italicPage !== undefined && typeof v.italicPage !== "boolean")
        )
          return false;
        return fields.markIndexEntry?.(v as MarkIndexEntryOptions) ?? false;
      },
    ),
    insertIndex: indexCommand(
      "insertIndex",
      () => !!fields.insertIndex && !!fields.canInsertIndex?.(),
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as Partial<InsertIndexOptions>;
        if (
          typeof v.locale !== "string" ||
          (v.identifier !== undefined && typeof v.identifier !== "string")
        )
          return false;
        return fields.insertIndex?.(v as InsertIndexOptions) ?? false;
      },
    ),
    updateIndex: indexCommand(
      "updateIndex",
      () => !!fields.updateIndex && !!fields.canUpdateIndex?.(),
      (p) => {
        if (
          p !== undefined &&
          (!p || typeof p !== "object" || Array.isArray(p))
        )
          return false;
        const locale = (p as { locale?: unknown } | undefined)?.locale;
        if (locale !== undefined && typeof locale !== "string") return false;
        return fields.updateIndex?.(locale) ?? false;
      },
    ),
    updateBodyFields: actionCommand(
      "updateBodyFields",
      (): void => {
        fields.updateBodyFields?.();
      },
      () => ({
        isEnabled:
          !!fields.updateBodyFields && (fields.canUpdateBodyFields?.() ?? true),
      }),
    ),
    updateSelectedFields: actionCommand(
      "updateSelectedFields",
      (): void => {
        fields.updateSelectedFields?.();
      },
      () => ({
        isEnabled:
          !!fields.updateSelectedFields &&
          (fields.canUpdateBodyFields?.() ?? true),
      }),
    ),
    insertFieldCode: indexCommand(
      "insertFieldCode",
      () => !!fields.insertFieldCode,
      (p) => {
        if (typeof p !== "string" || !p) return false;
        return fields.insertFieldCode?.(p) ?? false;
      },
    ),
    editFieldCode: indexCommand(
      "editFieldCode",
      () => !!fields.editFieldCode,
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as { instructionRunId?: unknown; code?: unknown };
        if (
          typeof v.instructionRunId !== "string" ||
          typeof v.code !== "string"
        )
          return false;
        return fields.editFieldCode?.(v.instructionRunId, v.code) ?? false;
      },
    ),
    editFieldCodeAtSelection: indexCommand(
      "editFieldCodeAtSelection",
      () => !!fields.editFieldCodeAtSelection,
      (p) => {
        if (typeof p !== "string" || !p) return false;
        return fields.editFieldCodeAtSelection?.(p) ?? false;
      },
    ),
    toggleFieldLock: indexCommand(
      "toggleFieldLock",
      () => !!fields.toggleFieldLock,
      (p) => {
        if (typeof p !== "string") return false;
        return fields.toggleFieldLock?.(p) ?? false;
      },
    ),
    toggleFieldCodes: actionCommand("toggleFieldCodes", (p): void => {
      const show = typeof p === "boolean" ? p : undefined;
      fields.toggleFieldCodes?.(show ?? true);
    }),
    nextField: actionCommand("nextField", (): void => {
      fields.navigateField?.("next");
    }),
    previousField: actionCommand("previousField", (): void => {
      fields.navigateField?.("previous");
    }),
    markAuthorityEntry: indexCommand(
      "markAuthorityEntry",
      () => !!fields.markAuthorityEntry,
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as { long?: unknown; short?: unknown; category?: unknown };
        if (
          typeof v.long !== "string" ||
          (v.short !== undefined && typeof v.short !== "string") ||
          (v.category !== undefined && typeof v.category !== "string")
        )
          return false;
        return (
          fields.markAuthorityEntry?.(
            v as import("@/core/commands/tableOfAuthorities.js").MarkAuthorityEntryOptions,
          ) ?? false
        );
      },
    ),
    insertTableOfAuthorities: indexCommand(
      "insertTableOfAuthorities",
      () => !!fields.insertTableOfAuthorities,
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as { locale?: unknown; category?: unknown };
        if (typeof v.locale !== "string" || typeof v.category !== "string")
          return false;
        return (
          fields.insertTableOfAuthorities?.(
            v as import("@/core/commands/tableOfAuthorities.js").InsertTableOfAuthoritiesOptions,
          ) ?? false
        );
      },
    ),
    updateTableOfAuthorities: indexCommand(
      "updateTableOfAuthorities",
      () => !!fields.updateTableOfAuthorities,
      (p) => {
        if (p !== undefined && (typeof p !== "object" || p === null))
          return false;
        const locale = (p as { locale?: unknown } | undefined)?.locale;
        if (locale !== undefined && typeof locale !== "string") return false;
        return fields.updateTableOfAuthorities?.(locale) ?? false;
      },
    ),
    insertTableOfFigures: indexCommand(
      "insertTableOfFigures",
      () => !!fields.insertTableOfFigures,
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as { identifier?: unknown; unlabeled?: unknown };
        if (
          typeof v.identifier !== "string" ||
          (v.unlabeled !== undefined && typeof v.unlabeled !== "boolean")
        )
          return false;
        return (
          fields.insertTableOfFigures?.(
            v as import("@/core/commands/tableOfFigures.js").InsertTableOfFiguresOptions,
          ) ?? false
        );
      },
    ),
    updateTableOfFigures: indexCommand(
      "updateTableOfFigures",
      () => !!fields.updateTableOfFigures,
      () => fields.updateTableOfFigures?.() ?? false,
    ),
    previewMergeRecord: indexCommand(
      "previewMergeRecord",
      () => !!fields.previewMergeRecord,
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as { records?: unknown; index?: unknown };
        if (!Array.isArray(v.records) || !Number.isInteger(v.index))
          return false;
        return (
          fields.previewMergeRecord?.(
            v.records as readonly Readonly<Record<string, string>>[],
            v.index as number,
          ) ?? false
        );
      },
    ),
    mergeToNewDocuments: actionCommand("mergeToNewDocuments", (p): void => {
      const v = (p ?? {}) as { records?: unknown };
      if (Array.isArray(v.records))
        fields.mergeToNewDocuments?.(
          v.records as readonly Readonly<Record<string, string>>[],
        );
    }),
    updateVariableFields: indexCommand(
      "updateVariableFields",
      () => !!fields.updateVariableFields,
      () => fields.updateVariableFields?.() ?? false,
    ),
    setFormFieldValue: indexCommand(
      "setFormFieldValue",
      () => !!fields.setFormFieldValue,
      (p) => {
        if (!p || typeof p !== "object") return false;
        const v = p as { name?: unknown; value?: unknown };
        if (typeof v.name !== "string" || typeof v.value !== "string")
          return false;
        return fields.setFormFieldValue?.(v.name, v.value) ?? false;
      },
    ),
    toggleFormCheckbox: indexCommand(
      "toggleFormCheckbox",
      () => !!fields.toggleFormCheckbox,
      (p) => {
        if (typeof p !== "string") return false;
        return fields.toggleFormCheckbox?.(p) ?? false;
      },
    ),
    insertDateField: actionCommand("insertDateField", (): void => {
      fields.insertDate();
    }),
    insertDateTime: actionCommand("insertDateTime", (p): void => {
      const payload = (p ?? {}) as { dateFormat?: string };
      fields.insertDateTime(payload.dateFormat);
    }),
    insertCrossReference: actionCommand("insertCrossReference", (p): void => {
      const xr = (p ?? {}) as { type?: string; bookmark?: string };
      if (typeof xr.bookmark !== "string" || xr.bookmark.length === 0) return;
      const type = xr.type === "PAGEREF" ? "PAGEREF" : "REF";
      fields.insertCrossReference({ type, bookmark: xr.bookmark });
    }),
  };
}

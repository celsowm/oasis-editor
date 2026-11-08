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
  return {
    insertDateField: actionCommand("insertDateField", (): void => {
      fields.insertDate();
    }),
    insertCrossReference: actionCommand("insertCrossReference", (p): void => {
      const xr = (p ?? {}) as { type?: string; bookmark?: string };
      if (typeof xr.bookmark !== "string" || xr.bookmark.length === 0) return;
      const type = xr.type === "PAGEREF" ? "PAGEREF" : "REF";
      fields.insertCrossReference({ type, bookmark: xr.bookmark });
    }),
  };
}

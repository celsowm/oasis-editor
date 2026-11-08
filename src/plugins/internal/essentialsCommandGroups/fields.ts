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
  };
}

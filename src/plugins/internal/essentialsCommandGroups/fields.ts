import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type { MarkIndexEntryOptions, InsertIndexOptions } from "@/core/commands/indexEntries.js";
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
  const indexCommand=(name:OasisBuiltinCommand,can:()=>boolean,execute:(p:unknown)=>boolean)=>{
    const base=actionCommand(name,()=>{},()=>({isEnabled:can()}));
    return {...base,execute:(p?:unknown)=>base.refresh?.().isEnabled!==false&&execute(p)};
  };
  return {
    markIndexEntry:indexCommand("markIndexEntry",()=>!!fields.markIndexEntry&&!!fields.canMarkIndexEntry?.(),p=>{
      if(!p||typeof p!=="object")return false;
      const v=p as Partial<MarkIndexEntryOptions>;
      if(!Array.isArray(v.path)||!v.path.every(x=>typeof x==="string")||
        (v.identifier!==undefined&&typeof v.identifier!=="string")||
        (v.boldPage!==undefined&&typeof v.boldPage!=="boolean")||
        (v.italicPage!==undefined&&typeof v.italicPage!=="boolean"))return false;
      return fields.markIndexEntry?.(v as MarkIndexEntryOptions)??false;
    }),
    insertIndex:indexCommand("insertIndex",()=>!!fields.insertIndex&&!!fields.canInsertIndex?.(),p=>{
      if(!p||typeof p!=="object")return false;
      const v=p as Partial<InsertIndexOptions>;
      if(typeof v.locale!=="string"||(v.identifier!==undefined&&typeof v.identifier!=="string"))return false;
      return fields.insertIndex?.(v as InsertIndexOptions)??false;
    }),
    updateIndex:indexCommand("updateIndex",()=>!!fields.updateIndex&&!!fields.canUpdateIndex?.(),p=>{
      if(p!==undefined&&(!p||typeof p!=="object"||Array.isArray(p)))return false;
      const locale=(p as {locale?:unknown}|undefined)?.locale;
      if(locale!==undefined&&typeof locale!=="string")return false;
      return fields.updateIndex?.(locale)??false;
    }),
    updateBodyFields: actionCommand("updateBodyFields", (): void => {
      fields.updateBodyFields?.();
    }, () => ({ isEnabled: !!fields.updateBodyFields && (fields.canUpdateBodyFields?.() ?? true) })),
    updateSelectedFields: actionCommand("updateSelectedFields", (): void => {
      fields.updateSelectedFields?.();
    }, () => ({ isEnabled: !!fields.updateSelectedFields && (fields.canUpdateBodyFields?.() ?? true) })),
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

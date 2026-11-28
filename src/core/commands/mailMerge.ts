import type { EditorDocument, EditorState } from "@/core/model.js";
import {
  planMailMerge,
  projectMergeRecord,
  type MergeRecord,
} from "@/core/document/mergeFields.js";

/** Preview one caller-supplied record in place. The instruction stream is
 * preserved; only cached MERGEFIELD results are projected. */
export function previewMergeRecord(
  state: EditorState,
  records: readonly MergeRecord[],
  index: number,
): EditorState {
  if (
    !state ||
    !Array.isArray(records) ||
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= records.length ||
    records.length > 1000
  )
    return state;
  const projected = projectMergeRecord(state.document, records[index]!);
  if (!projected) return state;
  return { ...state, document: projected.document };
}

/** Merge explicit records into documents using NEXT/NEXTIF/SKIPIF. Never
 * fetches data, never executes macros and never writes back into the editor. */
export function mergeToNewDocuments(
  state: EditorState,
  records: readonly MergeRecord[],
): readonly EditorDocument[] | undefined {
  if (!state) return undefined;
  return planMailMerge(records, state.document);
}

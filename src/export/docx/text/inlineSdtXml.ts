import type { EditorTextRun } from "@/core/model.js";
import { serializeSdtPrXml } from "./sdtXml.js";

/**
 * Re-wraps inline SDTs around their edited run stream. Consecutive runs sharing
 * the same outer wrapper are coalesced into one `w:sdt`; nested wrappers recurse
 * after the outer wrapper is stripped from the temporary run view.
 */
export function serializeRunsWithInlineSdts(
  runs: EditorTextRun[],
  serializeRun: (run: EditorTextRun) => string,
): string {
  let out = "";
  let index = 0;

  while (index < runs.length) {
    const run = runs[index]!;
    const wrapper = run.sdtWrappers?.[0];
    if (!wrapper) {
      out += serializeRun(run);
      index += 1;
      continue;
    }

    const group: EditorTextRun[] = [];
    let cursor = index;
    while (
      cursor < runs.length &&
      runs[cursor]!.sdtWrappers?.[0]?.groupId === wrapper.groupId
    ) {
      const current = runs[cursor]!;
      const rest = current.sdtWrappers!.slice(1);
      group.push({
        ...current,
        sdtWrappers: rest.length > 0 ? rest : undefined,
      } as EditorTextRun);
      cursor += 1;
    }

    const inner = serializeRunsWithInlineSdts(group, serializeRun);
    out +=
      `<w:sdt>${serializeSdtPrXml(wrapper.sdtPr)}${wrapper.sdtEndPrXml ?? ""}` +
      `<w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
    index = cursor;
  }

  return out;
}

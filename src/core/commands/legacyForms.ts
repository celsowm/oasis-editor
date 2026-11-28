/** Editing commands for preserved legacy form fields. All values are written
 * through explicit commands; direct text editing is already blocked by the
 * field mutation guards. Entry/exit macros are never executed. */
import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import { getActiveZone, getDocumentSections } from "@/core/model.js";
import { buildFieldStoryGraph } from "@/core/document/fieldStoryGraph.js";
import type { EditorLegacyFormFieldData } from "@/core/model.js";

export interface LegacyFormFieldDescriptor {
  name: string;
  control: EditorLegacyFormFieldData["control"];
  value: string;
  enabled: boolean;
  paragraphId: string;
  beginRunId: string;
  resultRunIds: readonly string[];
}

function find(
  state: EditorState,
  name: string,
): LegacyFormFieldDescriptor | undefined {
  if (getActiveZone(state) !== "main" || state.trackChangesEnabled || !name)
    return undefined;
  for (const section of getDocumentSections(state.document)) {
    const paragraphs: EditorParagraphNode[] = [];
    for (const block of section.blocks as readonly EditorBlockNode[]) {
      if (block.type !== "paragraph") return undefined;
      paragraphs.push(block);
    }
    const graph = buildFieldStoryGraph(paragraphs);
    if (graph.diagnostics.length) return undefined;
    for (const span of graph.spans) {
      const paragraph = paragraphs[span.begin.paragraphIndex]!;
      const begin = paragraph.runs.find((r) => r.id === span.begin.runId);
      if (
        begin?.kind !== "fieldChar" ||
        begin.fieldChar.formField?.name !== name
      )
        continue;
      if (
        span.parentIndex !== null ||
        !span.separator ||
        !span.end ||
        span.code.some((p) => p.kind !== "instruction") ||
        span.result.some((p) => p.kind !== "run")
      )
        return undefined;
      const data = begin.fieldChar.formField;
      return {
        name,
        control: data.control,
        value: data.value,
        enabled: data.enabled,
        paragraphId: paragraph.id,
        beginRunId: begin.id,
        resultRunIds: span.result.map((p) =>
          p.kind === "run" ? p.point.runId : "",
        ),
      };
    }
  }
  return undefined;
}

export function listLegacyFormFields(
  state: EditorState,
): LegacyFormFieldDescriptor[] {
  const names = new Set<string>();
  for (const section of getDocumentSections(state.document)) {
    for (const block of section.blocks as readonly EditorBlockNode[]) {
      if (block.type !== "paragraph") continue;
      for (const run of block.runs) {
        if (run.kind === "fieldChar" && run.fieldChar.formField)
          names.add(run.fieldChar.formField.name);
      }
    }
  }
  return [...names]
    .map((name) => find(state, name))
    .filter((v): v is LegacyFormFieldDescriptor => !!v);
}

function validValue(data: EditorLegacyFormFieldData, value: string): boolean {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    [...value].some((ch) => ch.charCodeAt(0) < 32)
  )
    return false;
  if (data.control === "text") {
    const max = data.textInput?.maxLength;
    if (max !== undefined && value.length > max) return false;
    if (
      data.textInput?.type === "number" &&
      value &&
      !/^-?(?:\d+)(?:\.\d+)?$/.test(value)
    )
      return false;
    return true;
  }
  if (data.control === "checkBox") return value === "" || value === "x";
  return (data.ddList?.listEntries ?? []).includes(value);
}

/** Set a legacy form field's cached value. Unqualified names, disabled
 * controls and values outside the control's domain are no-ops. */
export function setFormFieldValue(
  state: EditorState,
  name: string,
  value: string,
): EditorState {
  const target = find(state, name);
  if (!target || !target.enabled) return state;
  const allSections = getDocumentSections(state.document);
  for (const [sectionIndex, section] of allSections.entries()) {
    const index = (section.blocks as readonly EditorBlockNode[]).findIndex(
      (b) => b.id === target.paragraphId,
    );
    if (index < 0) continue;
    const paragraph = section.blocks[index] as EditorParagraphNode;
    const begin = paragraph.runs.find((r) => r.id === target.beginRunId);
    if (
      begin?.kind !== "fieldChar" ||
      !begin.fieldChar.formField ||
      !validValue(begin.fieldChar.formField, value)
    )
      return state;
    const runs = paragraph.runs.map((run) => {
      if (run.id === target.beginRunId && run.kind === "fieldChar") {
        const data = run.fieldChar.formField!;
        return {
          ...run,
          fieldChar: {
            ...run.fieldChar,
            formField: {
              ...data,
              value,
              ...(data.control === "checkBox"
                ? { checkBox: { ...data.checkBox!, checked: value === "x" } }
                : {}),
            },
          },
        };
      }
      if (target.resultRunIds.includes(run.id))
        return { ...run, text: run.id === target.resultRunIds[0] ? value : "" };
      return run;
    });
    const nextParagraph: EditorParagraphNode = { ...paragraph, runs };
    const blocks = [...section.blocks];
    blocks[index] = nextParagraph;
    return {
      ...state,
      document: {
        ...state.document,
        sections: allSections.map((s, i) =>
          i === sectionIndex ? { ...s, blocks } : s,
        ),
      },
    };
  }
  return state;
}

export function toggleFormCheckbox(
  state: EditorState,
  name: string,
): EditorState {
  const target = find(state, name);
  if (!target || target.control !== "checkBox") return state;
  return setFormFieldValue(state, name, target.value === "x" ? "" : "x");
}

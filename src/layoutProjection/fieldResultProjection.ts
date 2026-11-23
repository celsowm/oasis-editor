import type {
  EditorBlockNode, EditorDocument, EditorLayoutBlock, EditorLayoutDocument,
  EditorParagraphNode, EditorTextRun,
} from "@/core/model.js";
import { getDocumentSections, getParagraphLength } from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import { createDocumentFieldContext } from "@/core/document/fieldDocumentContext.js";
import { createStyleRefIndex } from "@/core/document/styleReference.js";
import { buildFieldStoryGraph } from "@/core/document/fieldStoryGraph.js";
import { compileFieldInstruction, evaluateField, type EvaluatableField } from "@/core/document/fieldEvaluation.js";
import { projectParagraphLayout, type LayoutProjectionContext } from "./paragraphPagination.js";

export interface FieldProjectionCandidate { runIndex: number; field: EvaluatableField }

/** Only complete, flat stories are qualified. Never mistake nested or
 * cross-paragraph cached results for independent editable scalar fields. */
export function indexFieldStory(blocks: readonly EditorBlockNode[], out: Map<string, FieldProjectionCandidate[]>): void {
  if (blocks.some(b => b.type !== "paragraph")) return;
  const ps = blocks as readonly EditorParagraphNode[];
  if (!ps.some(p => p.runs.some(r => r.kind === "field" || r.kind === "fieldChar" || r.kind === "fieldInstruction"))) return;
  const graph = buildFieldStoryGraph(ps);
  if (graph.diagnostics.length) return;
  const covered = new Set<number>();
  const add = (p: EditorParagraphNode, candidate: FieldProjectionCandidate): void => {
    const group = out.get(p.id) ?? [];
    // A shared header/footer story can appear in multiple section entries.
    if (!group.some(c => c.runIndex === candidate.runIndex)) group.push(candidate);
    out.set(p.id, group);
  };
  for (const span of graph.spans) {
    if (span.parentIndex !== null || !span.end) continue;
    for (let i = span.begin.paragraphIndex; i <= span.end.paragraphIndex; i++) covered.add(i);
    if (span.beginMarker.fieldLock || !span.separator ||
        span.begin.paragraphIndex !== span.end.paragraphIndex ||
        span.code.some(p => p.kind !== "instruction") || span.result.length !== 1) continue;
    const result = span.result[0]!;
    if (result.kind !== "run") continue;
    const paragraph = ps[span.begin.paragraphIndex]!;
    if (paragraph.runs[result.point.runIndex]?.kind !== "text") continue;
    const field = compileFieldInstruction(span.code.map(p => p.kind === "instruction" ? p.raw : "").join(""));
    if (field) add(paragraph, { runIndex: result.point.runIndex, field });
  }
  for (const [index, p] of ps.entries()) {
    if (covered.has(index)) continue;
    for (const [runIndex, run] of p.runs.entries()) {
      if (run.kind !== "field") continue;
      const { field } = run;
      if (field.type === "PAGE" || field.type === "NUMPAGES") {
        add(p, { runIndex, field: { type: field.type, format: field.format } });
      } else if (field.type === "DATE") {
        add(p, { runIndex, field: { type:"DATE", temporal:true, picture:field.dateFormat } });
      } else if ((field.type === "REF" || field.type === "PAGEREF") && field.bookmark) {
        add(p, { runIndex, field: { type: field.type, bookmark: field.bookmark } });
      }
    }
  }
}

export const isPlainFieldRun = (run: EditorTextRun): boolean =>
  (run.kind === "text" || run.kind === "field" || run.kind === "fieldChar" || run.kind === "fieldInstruction") &&
  !run.revision && !run.revisionRangeMarker && !run.sdtWrappers?.length &&
  !run.styles?.hidden && !run.styles?.rtl;

function pageHasExclusions(blocks: readonly EditorLayoutBlock[]): boolean {
  return blocks.some(b => b.sourceBlock.type !== "paragraph" || !!b.sourceBlock.dropCap ||
    b.sourceBlock.runs.some(r => (r.kind === "image" && !!r.image.floating) ||
      (r.kind === "textBox" && !!r.textBox.floating) || r.kind === "opaque"));
}

/** Last, geometry-certified projection pass shared by Canvas and PDF.
 * Only accept replacements with unchanged source UTF-16 lengths, line
 * boundaries and vertical metrics. Model runs and cached DOCX results are
 * untouched. Length-changing updates require explicit offset transforms
 * and a convergent repagination pass, not a paint-only substitution. */
export function refreshProjectedFields(
  document: EditorDocument, layout: EditorLayoutDocument,
  measurer: ITextMeasurer, projectionContext: LayoutProjectionContext,
): EditorLayoutDocument {
  const sections = getDocumentSections(document);
  const candidates = new Map<string, FieldProjectionCandidate[]>();
  indexFieldStory(sections.flatMap(s => s.blocks), candidates);
  for (const s of sections) {
    for (const story of [s.header,s.firstPageHeader,s.evenPageHeader,s.footer,s.firstPageFooter,s.evenPageFooter]) {
      if (story) indexFieldStory(story, candidates);
    }
  }
  if (!candidates.size) return layout;
  const index = createDocumentFieldContext(document, layout);
  const styleRefs = createStyleRefIndex(document,layout);
  let changed = false;
  const pages = layout.pages.map(page => {
    const fieldContext = index.forPage(page.index);
    const section = sections[page.sectionIndex ?? 0];
    const numberingFormat = section?.pageNumbering?.format;
    const refresh = (blocks: EditorLayoutBlock[] | undefined, story:"body"|"header"|"footer"): EditorLayoutBlock[] | undefined => {
      const body=story==="body";
      if (!blocks || pageHasExclusions(blocks)) return blocks;
      let blockChanged = false;
      const next = blocks.map(block => {
        const p = block.sourceBlock, old = block.layout;
        if (p.type !== "paragraph" || !old || !candidates.has(p.id) ||
            p.list || p.dropCap || p.sdtWrappers?.length || p.numberingRevision ||
            p.style?.bidi || p.style?.textDirection && p.style.textDirection !== "lrTb" ||
            !p.runs.every(isPlainFieldRun)) return block;
        const length = getParagraphLength(p);
        // A complete paragraph must be present on this actual page; even a
        // split body field may not be evaluated using a provisional page.
        if ((old.startOffset ?? 0) !== 0 || (old.endOffset ?? old.text.length) !== length ||
            old.text.length !== length || !old.contentWidth) return block;
        if (body && (index.pageIndexAt(p.id, 0) !== page.index &&
            // Existing PAGE/NUMPAGES projections may already differ in
            // content from source. Certify whole-run coordinates below.
            !p.runs.some(r => r.kind === "field" && (r.field.type === "PAGE" || r.field.type === "NUMPAGES")))) return block;
        const offsets: number[] = [];
        let offset = 0;
        for (const run of p.runs) {
          offsets.push(offset);
          if (run.text.length) {
            const matched = old.fragments.filter(f => f.runId === run.id && f.startOffset === offset && f.endOffset === offset + run.text.length);
            if (matched.length !== 1 || matched[0]!.text !== old.text.slice(offset,offset+run.text.length)) return block;
          }
          offset += run.text.length;
        }
        const texts = p.runs.map((r,i) => old.text.slice(offsets[i]!,offsets[i]!+r.text.length));
        let differs = false;
        for (const candidate of candidates.get(p.id)!) {
          const {runIndex,field} = candidate;
          if (field.type === "PAGE" && !field.format && numberingFormat && numberingFormat !== "decimal") continue;
          // PAGEREF formatted labels and chapter numbering remain separate.
          if (field.type === "PAGEREF" && sections.some(s => s.pageNumbering?.format && s.pageNumbering.format !== "decimal")) continue;
          const previous = texts[runIndex]!;
          const evaluated = evaluateField(field,{...fieldContext,styleRefText:body
            ? (name,last,output)=>styleRefs.forBody(p.id,name,last,{
                output,offset:offsets[runIndex],
                locale:p.runs[runIndex]?.styles?.language?.value?.toLowerCase()==="pt-br"?"pt-BR":"en-US",
              })
            : (name,last,output)=>styleRefs.forPage(page.index,name,last,{
                output,zone:story,
                locale:p.runs[runIndex]?.styles?.language?.value?.toLowerCase()==="pt-br"?"pt-BR":"en-US",
              })}, previous);
          if (evaluated.status !== "resolved" || evaluated.text === previous ||
              evaluated.text.length !== p.runs[runIndex]!.text.length ||
              /[\r\n\t]/.test(evaluated.text) ||
              Array.from(evaluated.text).length !== evaluated.text.length) continue;
          texts[runIndex] = evaluated.text;
          differs = true;
        }
        if (!differs) return block;
        // Ephemeral text-only measurement input, not a document mutation.
        // It bypasses the legacy numeric projection for this single pass.
        const derived: EditorParagraphNode = {
          ...p, runs:p.runs.map((r,i):EditorTextRun =>
            r.kind === "field" ? {id:r.id,kind:"text",text:texts[i]!,styles:r.styles} :
            {...r,text:texts[i]!}),
        };
        const projected = projectParagraphLayout(derived, undefined, undefined, document.styles,
          old.contentWidth, measurer, document.settings?.defaultTabStop, projectionContext);
        if (projected.text !== texts.join("") || projected.endOffset !== length ||
            projected.lines.length !== old.lines.length ||
            projected.lines.some((line,i) => {
              const prior = old.lines[i]!;
              return line.startOffset !== prior.startOffset || line.endOffset !== prior.endOffset ||
                Math.abs(line.height-prior.height)>0.01 || Math.abs(line.top-prior.top)>0.01;
            })) return block;
        blockChanged = true;
        return {...block,layout:projected};
      });
      if (blockChanged) { changed = true; return next; }
      return blocks;
    };
    const blocks = refresh(page.blocks,"body")!;
    const headerBlocks = refresh(page.headerBlocks,"header");
    const footerBlocks = refresh(page.footerBlocks,"footer");
    return blocks === page.blocks && headerBlocks === page.headerBlocks && footerBlocks === page.footerBlocks
      ? page : {...page,blocks,headerBlocks,footerBlocks};
  });
  return changed ? {...layout,pages} : layout;
}

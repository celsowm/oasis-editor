import type {
  EditorBlockNode,
  EditorFieldChar,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorSection,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getBlockParagraphs,
  getDocumentParagraphs,
  getDocumentSections,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import {
  PT_PER_PX as PX_TO_PT,
  TWIPS_PER_INCH,
  PX_PER_INCH,
} from "@/core/units.js";
import { roundTo } from "@/utils/round.js";
import { getHeadingLevel } from "@/core/headings.js";
import {createTocOutlineResolver} from "@/core/document/tocOutline.js";
import { isValidTocPageLabel } from "@/core/format/pageNumberFormat.js";
import {findQualifiedTocRegion,createTocPageNumberResolver,type TocFieldSettings} from "@/core/document/tocFields.js";
import type {EditorLayoutDocument} from "@/core/model.js";
import { createEditorParagraph, createEditorRun } from "@/core/editorState.js";
import { clampPosition } from "@/core/selection.js";
import { withSelection } from "@/core/selection/rangeEditing.js";

/** Default TOC scope: outline levels 1–3, matching Word's `TOC \o "1-3"`. */
export const DEFAULT_TOC_MAX_LEVEL = 3;

/** Field instruction emitted for a generated table of contents. */
const tocInstruction = (maxLevel: number): string => ` TOC \\o "1-${maxLevel}" \\h \\z \\u `;

const twipsToPx = (twips: number): number =>
  Math.round((twips / TWIPS_PER_INCH) * PX_PER_INCH);

/** A heading captured for a TOC entry. */
export interface TocHeading {
  id: string;
  level: number;
  text: string;
}

/** Page number resolver: heading paragraph id → printed page number. */
export type TocPageNumberResolver = (headingId: string) => number | string | undefined;

/**
 * Collect heading paragraphs (levels 1..maxLevel) in document order. Headings
 * are detected case-insensitively via {@link getHeadingLevel}, so both the
 * editor's own `heading1` and Word's imported `Heading1` styles qualify.
 */
export function collectTocHeadings(
  state: EditorState,
  maxLevel = DEFAULT_TOC_MAX_LEVEL,
): TocHeading[] {
  const headings: TocHeading[] = [];
  for (const paragraph of getDocumentParagraphs(state.document)) {
    const level = getHeadingLevel(paragraph.style?.styleId);
    if (level === null || level > maxLevel) continue;
    const text = getParagraphText(paragraph).trim();
    if (!text) continue;
    headings.push({ id: paragraph.id, level, text });
  }
  return headings;
}

/** Resolve explicit TOC style names against the paragraph-style catalog.
 * Refuse missing/ambiguous names and conflicting mappings; never silently
 * remove an imported cache because a style could not be resolved.
 */
export function collectQualifiedTocHeadings(state:EditorState,options:TocFieldSettings,maxLevel=9):TocHeading[]|undefined{
  if(maxLevel<options.endLevel||options.styleMappings?.some(m=>m.level>maxLevel))return undefined;
  if(!options.styleMappings&&!options.useOutline)return collectTocHeadings(state,options.endLevel).filter(h=>h.level>=options.startLevel);
  const resolveOutline=options.useOutline?createTocOutlineResolver(state.document):undefined;
  const styles=Object.values(state.document.styles??{});
  const normalize=(s:string)=>s.trim().toLowerCase();
  const mapped=new Map<string,number>();
  for(const {name,level} of options.styleMappings??[]){
    const key=normalize(name);
    const candidates=styles.filter(s=>normalize(s.id)===key||normalize(s.name)===key);
    if(candidates.length!==1||candidates[0]!.type!=="paragraph")return undefined;
    const id=candidates[0]!.id;
    if(mapped.has(id))return undefined;
    mapped.set(id,level);
  }
  const cacheIds=new Set<string>();
  for(const section of getDocumentSections(state.document)){
    const region=findQualifiedTocRegion(section.blocks);
    if(region)for(const b of section.blocks.slice(region.startBlockIndex,region.endBlockIndex+1))cacheIds.add(b.id);
  }
  const headings:TocHeading[]=[];
  for(const p of getDocumentParagraphs(state.document)){
    const id=p.style?.styleId;
    const custom=id===undefined?undefined:mapped.get(id);
    // With the outline switch, the effective paragraph level (including
    // explicit body-text overrides) controls inclusion. Without it retain
    // the existing built-in Heading range semantics.
    const effective=resolveOutline?resolveOutline(p):options.customOnly?null:getHeadingLevel(id);
    if(effective===undefined)return undefined;
    const outline=effective!==null&&effective>=options.startLevel&&effective<=options.endLevel?effective:undefined;
    if(custom!==undefined&&outline!==undefined&&custom!==outline)return undefined;
    const level=custom??outline;
    if(level===undefined)continue;
    if(cacheIds.has(p.id))return undefined;
    const text=getParagraphText(p).trim();
    if(text)headings.push({id:p.id,level,text});
  }
  return headings;
}

function makeRun(partial: {
  text: string;
  fieldChar?: EditorFieldChar;
  fieldInstruction?: string;
}): EditorTextRun {
  const id = createEditorRun(partial.text).id;
  if (partial.fieldChar) {
    return {
      id,
      text: partial.text,
      kind: "fieldChar",
      fieldChar: partial.fieldChar,
    };
  }
  if (partial.fieldInstruction !== undefined) {
    return {
      id,
      text: partial.text,
      kind: "fieldInstruction",
      fieldInstruction: partial.fieldInstruction,
    };
  }
  return { id, text: partial.text, kind: "text" };
}

function makeParagraph(
  runs: EditorTextRun[],
  style?: EditorParagraphStyle,
): EditorParagraphNode {
  const paragraph = createEditorParagraph("");
  paragraph.runs = runs;
  if (style) paragraph.style = style;
  return paragraph;
}

/**
 * Build the paragraph that holds an entry: "<title>\t<page>", with a right tab
 * stop (dot leader) at the content's right edge so the page number aligns to
 * the margin with a dotted leader, indented by outline level.
 *
 * Entries inherit the Normal character style (plain, no bold/color), matching
 * Word's regenerated TOC1/TOC2/TOC3 look — levels are distinguished only by the
 * left indent.
 */
function buildEntryParagraph(
  heading: TocHeading,
  pageNumber: number | string | undefined,
  rightTabPositionPt: number,
): EditorParagraphNode {
  const pageLabel = pageNumber !== undefined ? String(pageNumber) : "";
  const run = makeRun({ text: `${heading.text}\t${pageLabel}` });
  const style: EditorParagraphStyle = {
    tabs: [{ position: rightTabPositionPt, type: "right", leader: "dot" }],
    spacingAfter: twipsToPx(40),
    indentLeft: twipsToPx((heading.level - 1) * 397),
  };
  return makeParagraph([run], style);
}

/** Content width (in points) of a section, where the right tab stop sits. */
function rightTabPositionForSection(section: EditorSection): number {
  const { width, margins } = section.pageSettings;
  const contentWidthPx = Math.max(0, width - margins.left - margins.right);
  return roundTo(contentWidthPx * PX_TO_PT, 2);
}

/** The field-start marker paragraph: begin + instruction + separate. */
function buildStartMarkerParagraph(maxLevel: number): EditorParagraphNode {
  return makeParagraph([
    makeRun({ text: "", fieldChar: { kind: "begin" } }),
    makeRun({ text: "", fieldInstruction: tocInstruction(maxLevel) }),
    makeRun({ text: "", fieldChar: { kind: "separate" } }),
  ]);
}

/** The field-end marker paragraph. */
function buildEndMarkerParagraph(): EditorParagraphNode {
  return makeParagraph([makeRun({ text: "", fieldChar: { kind: "end" } })]);
}

/** Build the full field block sequence: start marker, entries, end marker. */
function buildTocBlocks(
  headings: TocHeading[],
  resolvePage: TocPageNumberResolver,
  rightTabPositionPt: number,
  maxLevel: number,
): EditorParagraphNode[] {
  const entries = headings.map((heading): EditorParagraphNode =>
    {
      const value=resolvePage(heading.id);
      return buildEntryParagraph(heading,value!==undefined&&isValidTocPageLabel(value)?value:undefined,rightTabPositionPt);
    },
  );
  return [buildStartMarkerParagraph(maxLevel), ...entries, buildEndMarkerParagraph()];
}

function replaceSectionBlocks(
  state: EditorState,
  sectionIndex: number,
  nextBlocks: EditorBlockNode[],
  selectionParagraph: EditorParagraphNode,
): EditorState {
  const sections = getDocumentSections(state.document);
  const section = sections[sectionIndex];
  if (!section) return state;
  const nextSections = [...sections];
  nextSections[sectionIndex] = { ...section, blocks: nextBlocks };
  return {
    ...state,
    document: { ...state.document, sections: nextSections },
    selection: withSelection(paragraphOffsetToPosition(selectionParagraph, 0)),
  };
}

/**
 * Insert a generated table of contents after the block holding the caret.
 * Operates on section blocks (not the flattened paragraph list) so it is safe
 * in documents containing tables.
 */
export function insertTableOfContents(
  state: EditorState,
  resolvePage: TocPageNumberResolver = (): undefined => undefined,
  maxLevel = DEFAULT_TOC_MAX_LEVEL,
): EditorState {
  const zone = getActiveZone(state);
  if (zone !== "main" || !Number.isInteger(maxLevel) || maxLevel < 1 || maxLevel > 9) return state;

  const sectionIndex = getActiveSectionIndex(state);
  const sections = getDocumentSections(state.document);
  const section = sections[sectionIndex];
  if (!section) return state;

  const headings = collectQualifiedTocHeadings(state,{startLevel:1,endLevel:maxLevel,hyperlinks:true,hideWebNumbers:true,useOutline:true},maxLevel);
  if(!headings)return state;
  const tocBlocks = buildTocBlocks(
    headings,
    resolvePage,
    rightTabPositionForSection(section),
    maxLevel,
  );

  const focus = clampPosition(state, state.selection.focus);
  const blockIndex = section.blocks.findIndex((block): boolean => {
    if (block.id === focus.paragraphId) return true;
    if (block.type === "paragraph") return false;
    return getBlockParagraphs(block).some(
      (p): boolean => p.id === focus.paragraphId,
    );
  });
  const insertAt = blockIndex === -1 ? section.blocks.length : blockIndex + 1;

  const nextBlocks = [
    ...section.blocks.slice(0, insertAt),
    ...tocBlocks,
    ...section.blocks.slice(insertAt),
  ];
  return replaceSectionBlocks(state, sectionIndex, nextBlocks, tocBlocks[0]!);
}

/** Only complete, recognized TOC fields may be regenerated. */
const findTocRegion=findQualifiedTocRegion;

/**
 * Regenerate the entries of an existing TOC field from the current headings,
 * preserving the field's begin/instruction/separate and end markers. Returns
 * the unchanged state when no TOC field is present.
 */
export function updateTableOfContents(
  state: EditorState,
  resolvePage: TocPageNumberResolver = (): undefined => undefined,
  maxLevel = 9,
): EditorState {
  if(getActiveZone(state)!=="main"||!Number.isInteger(maxLevel)||maxLevel<1||maxLevel>9)return state;
  const sectionIndex = getActiveSectionIndex(state);
  const sections = getDocumentSections(state.document);
  const section = sections[sectionIndex];
  if (!section) return state;

  const region = findTocRegion(section.blocks);
  if (!region || maxLevel < region.endLevel) return state;

  const headings = collectQualifiedTocHeadings(state,region,maxLevel);
  if(!headings)return state;
  const byId=new Map(getDocumentParagraphs(state.document).map(p=>[p.id,p]));
  if(headings.some(h=>{
    const p=byId.get(h.id);
    return !p||p.sdtWrappers?.length||p.numberingRevision||p.dropCap||
      p.runs.some(r=>r.kind!=="text"||r.revision||r.revisionRangeMarker||
        r.sdtWrappers?.length||r.styles?.hidden||r.styles?.rtl)||
      h.text.length>4096||/[\r\n\t]/.test(h.text);
  }))return state;
  const prior=section.blocks.slice(region.startBlockIndex+1,region.endBlockIndex);
  const pageValues=headings.map(h=>resolvePage(h.id));
  if(pageValues.some(n=>n!==undefined&&!isValidTocPageLabel(n)))return state;
  // Do not erase printed labels from a source TOC when no certified
  // pagination value was supplied for a heading.
  if(pageValues.some(n=>n===undefined)&&prior.some(p=>
    p.type==="paragraph"&&/\t\S/.test(getParagraphText(p))))return state;
  const entries = headings.map((heading,i): EditorParagraphNode =>
    buildEntryParagraph(heading,pageValues[i],rightTabPositionForSection(section)),
  );

  if(prior.length===entries.length&&prior.every((p,i)=>
    p.type==="paragraph"&&getParagraphText(p)===getParagraphText(entries[i]!)))return state;
  const nextBlocks = [
    ...section.blocks.slice(0, region.startBlockIndex + 1),
    ...entries,
    ...section.blocks.slice(region.endBlockIndex),
  ];
  const selectionParagraph =
    entries[0] ??
    (section.blocks[region.startBlockIndex] as EditorParagraphNode);
  return replaceSectionBlocks(
    state,
    sectionIndex,
    nextBlocks,
    selectionParagraph,
  );
}

/** Update a qualified TOC from a known completed layout snapshot. This is
 * intentionally not automatic convergence; callers must remeasure if pages
 * shift after regeneration. Missing page facts are kept blank. */
export function updateTableOfContentsFromLayout(
  state:EditorState, layout:EditorLayoutDocument,maxLevel=9,
):EditorState{
  return updateTableOfContents(state,createTocPageNumberResolver(state.document,layout),maxLevel);
}

/** Whether a TOC field exists in the active section (for menu enablement). */
export function hasTableOfContents(state: EditorState): boolean {
  if(getActiveZone(state)!=="main")return false;
  const section = getDocumentSections(state.document)[
    getActiveSectionIndex(state)
  ];
  return section ? findTocRegion(section.blocks) !== undefined : false;
}

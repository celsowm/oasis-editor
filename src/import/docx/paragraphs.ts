import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
} from "../../core/model.js";
import { createEditorParagraphFromRuns } from "../../core/editorState.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
} from "./xmlHelpers.js";
import { PAGE_BREAK_MARKER } from "./units.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type ThemeFontMap } from "./themeFonts.js";
import {
  parseParagraphStyle,
  normalizeImportedParagraphStyle,
  normalizeImportedRunStyle,
  withDocxImplicitSingleLineHeight,
} from "./styles.js";
import { type NumberingMaps, parseParagraphList } from "./numbering.js";
import { type ImportedRun, parseRunsContainer } from "./runs.js";

function createImportedParagraph(
  runs: ImportedRun[],
  paragraphStyle: EditorParagraphStyle | undefined,
  list: EditorParagraphListStyle | undefined,
): EditorParagraphNode {
  const paragraph = createEditorParagraphFromRuns(
    runs.length > 0
      ? runs.map((run) => ({ text: run.text, styles: run.styles, image: run.image }))
      : [{ text: "" }],
  );
  runs.forEach((run, index) => {
    if (run.field) {
      paragraph.runs[index]!.field = { ...run.field };
    }
    if (run.footnoteReference) {
      // Store a transient marker on the run; the import driver remaps the
      // docxId to the document-local footnote id after `word/footnotes.xml`
      // has been parsed. Using a non-conflicting symbol-less property keeps
      // existing consumers unaffected.
      (paragraph.runs[index]! as any).__importedFootnoteRef = { ...run.footnoteReference };
    }
  });
  paragraph.style = paragraphStyle ? { ...paragraphStyle } : undefined;
  for (const run of paragraph.runs) {
    run.styles = normalizeImportedRunStyle(run.styles, paragraph.style?.styleId);
  }
  paragraph.list = list ? { ...list } : undefined;
  return paragraph;
}

function splitRunsAtPageBreaks(runs: ImportedRun[]): { segments: ImportedRun[][]; hasPageBreak: boolean } {
  const segments: ImportedRun[][] = [[]];
  let hasPageBreak = false;

  const appendRun = (run: ImportedRun, text: string) => {
    if (text.length === 0 && !run.image && !run.field) {
      return;
    }
    segments[segments.length - 1]!.push({
      ...run,
      text,
    });
  };

  for (const run of runs) {
    if (!run.text.includes(PAGE_BREAK_MARKER)) {
      appendRun(run, run.text);
      continue;
    }

    const parts = run.text.split(PAGE_BREAK_MARKER);
    parts.forEach((part, index) => {
      appendRun(run, part);
      if (index < parts.length - 1) {
        hasPageBreak = true;
        segments.push([]);
      }
    });
  }

  return { segments, hasPageBreak };
}

function paragraphHasVisibleContent(runs: ImportedRun[]): boolean {
  return runs.some((run) => run.image || run.field || run.text.replace(/\s/g, "").length > 0);
}

export async function parseParagraphNodes(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  themeFonts: ThemeFontMap,
  inheritedStyle?: EditorParagraphStyle,
): Promise<{ paragraphs: EditorParagraphNode[]; pageBreakAfter: boolean }> {
  const paragraphProperties = getFirstChildByTagNameNS(paragraphNode, WORD_NS, "pPr");
  const runs = await parseRunsContainer(paragraphNode, numberingMaps, zip, relsMap, assets, themeFonts);
  const parsedStyle = withDocxImplicitSingleLineHeight(parseParagraphStyle(paragraphProperties));
  const paragraphStyle = normalizeImportedParagraphStyle(
    inheritedStyle ? { ...inheritedStyle, ...(parsedStyle ?? {}) } : parsedStyle,
  );
  const list = parseParagraphList(paragraphProperties, numberingMaps);
  const { segments, hasPageBreak } = splitRunsAtPageBreaks(runs);

  if (!hasPageBreak) {
    return {
      paragraphs: [createImportedParagraph(runs, paragraphStyle, list)],
      pageBreakAfter: false,
    };
  }

  const paragraphs: EditorParagraphNode[] = [];
  let pendingPageBreakBefore = false;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    if (index > 0) {
      pendingPageBreakBefore = true;
    }
    if (!paragraphHasVisibleContent(segment)) {
      continue;
    }

    const style = pendingPageBreakBefore
      ? { ...(paragraphStyle ?? {}), pageBreakBefore: true }
      : paragraphStyle;
    paragraphs.push(createImportedParagraph(segment, style, list));
    pendingPageBreakBefore = false;
  }

  return {
    paragraphs,
    pageBreakAfter: pendingPageBreakBefore,
  };
}

export async function parseParagraphNode(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  themeFonts: ThemeFontMap,
  inheritedStyle?: EditorParagraphStyle,
): Promise<EditorParagraphNode> {
  const parsed = await parseParagraphNodes(
    paragraphNode,
    numberingMaps,
    zip,
    relsMap,
    assets,
    themeFonts,
    inheritedStyle,
  );
  return parsed.paragraphs[0] ?? createEditorParagraphFromRuns([{ text: "" }]);
}

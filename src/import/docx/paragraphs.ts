import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTextRun,
  EditorTextStyle,
} from "../../core/model.js";
import { createEditorParagraphFromRuns } from "../../core/editorState.js";
import { WORD_NS, getFirstChildByTagNameNS } from "./xmlHelpers.js";
import { PAGE_BREAK_MARKER } from "./units.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { parseRunStyle, normalizeImportedRunStyle } from "./runStyle.js";
import {
  parseParagraphStyle,
  normalizeImportedParagraphStyle,
  withDocxImplicitSingleLineHeight,
} from "./paragraphStyle.js";
import { type NumberingMaps, parseParagraphList } from "./numbering.js";
import { type ImportedRun, parseRunsContainer } from "./runs.js";

function createImportedParagraph(
  runs: ImportedRun[],
  paragraphStyle: EditorParagraphStyle | undefined,
  list: EditorParagraphListStyle | undefined,
  markRunStyle?: EditorTextStyle,
): EditorParagraphNode {
  const paragraph = createEditorParagraphFromRuns(
    runs.length > 0
      ? runs.map((run) => ({
          text: run.text,
          styles: run.styles,
          image: run.image,
        }))
      : // An empty paragraph still carries the formatting of its paragraph mark
        // (`w:pPr/w:rPr`), which Word uses to render the blank line's font/size.
        // Apply it so empty lines match Word instead of falling back to defaults.
        [{ text: "", styles: markRunStyle }],
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
      (
        paragraph.runs[index]! as EditorTextRun & {
          __importedFootnoteRef?: { docxId: string; customMark?: string };
        }
      ).__importedFootnoteRef = {
        ...run.footnoteReference,
      };
    }
  });
  paragraph.style = paragraphStyle ? { ...paragraphStyle } : undefined;
  for (const run of paragraph.runs) {
    run.styles = normalizeImportedRunStyle(
      run.styles,
      paragraph.style?.styleId,
    );
  }
  paragraph.list = list ? { ...list } : undefined;
  return paragraph;
}

function splitRunsAtPageBreaks(runs: ImportedRun[]): {
  segments: ImportedRun[][];
  hasPageBreak: boolean;
} {
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
  return runs.some(
    (run) => run.image || run.field || run.text.replace(/\s/g, "").length > 0,
  );
}

export async function parseParagraphNodes(
  paragraphNode: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  inheritedStyle?: EditorParagraphStyle,
): Promise<{ paragraphs: EditorParagraphNode[]; pageBreakAfter: boolean }> {
  const paragraphProperties = getFirstChildByTagNameNS(
    paragraphNode,
    WORD_NS,
    "pPr",
  );
  const runs = await parseRunsContainer(
    paragraphNode,
    numberingMaps,
    zip,
    relsMap,
    assets,
    theme,
  );
  const parsedStyle = withDocxImplicitSingleLineHeight(
    parseParagraphStyle(paragraphProperties),
  );
  const paragraphStyle = normalizeImportedParagraphStyle(
    inheritedStyle
      ? { ...inheritedStyle, ...(parsedStyle ?? {}) }
      : parsedStyle,
  );
  // Paragraph-mark run properties: the font/size Word applies to the blank line
  // of an empty paragraph (and to its trailing mark).
  const markRunStyle = parseRunStyle(
    getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "rPr"),
    theme,
  );
  const list = parseParagraphList(paragraphProperties, numberingMaps);
  const { segments, hasPageBreak } = splitRunsAtPageBreaks(runs);

  if (!hasPageBreak) {
    return {
      paragraphs: [
        createImportedParagraph(runs, paragraphStyle, list, markRunStyle),
      ],
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
    paragraphs.push(
      createImportedParagraph(segment, style, list, markRunStyle),
    );
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
  theme: DocxImportTheme,
  inheritedStyle?: EditorParagraphStyle,
): Promise<EditorParagraphNode> {
  const parsed = await parseParagraphNodes(
    paragraphNode,
    numberingMaps,
    zip,
    relsMap,
    assets,
    theme,
    inheritedStyle,
  );
  return parsed.paragraphs[0] ?? createEditorParagraphFromRuns([{ text: "" }]);
}

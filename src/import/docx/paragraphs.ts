import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDropCap,
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
import type { ImportedBookmarkMarker } from "./runs/types.js";
import { parseTxbxContentBlocks } from "./nestedBlocks.js";
import { parseDropCapFrame } from "./dropCap.js";

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
    if (run.fieldChar) {
      paragraph.runs[index]!.fieldChar = { ...run.fieldChar };
    }
    if (run.fieldInstruction !== undefined) {
      paragraph.runs[index]!.fieldInstruction = run.fieldInstruction;
    }
    if (run.textBox) {
      paragraph.runs[index]!.textBox = run.textBox;
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
    if (run.endnoteReference) {
      // Transient marker remapped to the document-local endnote id by the
      // import driver after `word/endnotes.xml` has been parsed.
      (
        paragraph.runs[index]! as EditorTextRun & {
          __importedEndnoteRef?: { docxId: string; customMark?: string };
        }
      ).__importedEndnoteRef = {
        ...run.endnoteReference,
      };
    }
    if (run.bookmark) {
      // Transient marker extracted into the document-level bookmark registry by
      // the import driver, which knows each paragraph's id + text offset.
      (
        paragraph.runs[index]! as EditorTextRun & {
          __importedBookmark?: ImportedBookmarkMarker;
        }
      ).__importedBookmark = { ...run.bookmark };
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

  const appendRun = (run: ImportedRun, text: string): void => {
    if (
      text.length === 0 &&
      !run.image &&
      !run.textBox &&
      !run.field &&
      !run.fieldChar &&
      run.fieldInstruction === undefined &&
      !run.bookmark
    ) {
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
    (run) =>
      run.image ||
      run.textBox ||
      run.field ||
      run.fieldChar ||
      run.fieldInstruction !== undefined ||
      run.bookmark ||
      run.text.replace(/\s/g, "").length > 0,
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
): Promise<{
  paragraphs: EditorParagraphNode[];
  pageBreakAfter: boolean;
  dropCapFrame?: EditorDropCap;
}> {
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
    undefined,
    (container) =>
      parseTxbxContentBlocks(
        container,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
      ),
  );
  const parsedStyle = withDocxImplicitSingleLineHeight(
    parseParagraphStyle(paragraphProperties),
  );
  // Paragraph-mark run properties: the font/size Word applies to the blank line
  // of an empty paragraph (and to its trailing mark).
  const markRunStyle = parseRunStyle(
    getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "rPr"),
    theme,
  );
  const listResult = parseParagraphList(paragraphProperties, numberingMaps);
  const list = listResult?.list;

  // Apply numbering-level indentation as a fallback when the paragraph itself
  // has no explicit indent. Word inherits list indentation from the abstractNum
  // level definition rather than repeating it on each paragraph.
  let styleWithListIndent = parsedStyle;
  if (listResult?.indent) {
    const { left, hanging } = listResult.indent;
    const base = parsedStyle ?? {};
    styleWithListIndent = {
      ...base,
      ...(base.indentLeft === undefined && left !== undefined
        ? { indentLeft: left }
        : {}),
      ...(base.indentHanging === undefined && hanging !== undefined
        ? { indentHanging: hanging }
        : {}),
    };
  }

  const paragraphStyle = normalizeImportedParagraphStyle(
    inheritedStyle
      ? { ...inheritedStyle, ...(styleWithListIndent ?? {}) }
      : styleWithListIndent,
  );

  // A drop cap frame paragraph (`w:framePr/@dropCap`) is not emitted as a block;
  // its cap rides out to the import driver, which attaches it to the next
  // paragraph (the body text that wraps around the cap).
  const dropCapFrame = parseDropCapFrame(paragraphProperties, runs);
  if (dropCapFrame) {
    return { paragraphs: [], pageBreakAfter: false, dropCapFrame };
  }

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

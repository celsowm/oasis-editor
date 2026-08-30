import JSZip from "jszip";
import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDropCap,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorRunBase,
  EditorTextRun,
  EditorTextStyle,
} from "@/core/model.js";
import {
  createEditorNodeId,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
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
import type {
  ImportedBookmarkMarker,
  ImportedCommentMarker,
  ParseNestedBlocks,
} from "./runs/types.js";
import { parseDropCapFrame } from "./dropCap.js";
import {
  setEditorParagraphOoxmlSource,
  setEditorRunOoxmlSource,
} from "@/ooxml/word/sourceFragments.js";

interface ImportedParagraphSource {
  xml?: string;
  attributes?: string;
  paragraphPropertiesXml?: string;
  runXml?: string[];
}

function serializeShallowElementAttributes(
  element: XmlElement,
  serializer: XMLSerializer,
): string | undefined {
  const shallowXml = serializer.serializeToString(element.cloneNode(false));
  const openTagEnd = shallowXml.indexOf(">");
  if (openTagEnd < 0) {
    return undefined;
  }
  const openTag = shallowXml.slice(0, openTagEnd + 1);
  const elementName = element.tagName;
  const rawAttributes = openTag
    .slice(`<${elementName}`.length, openTag.endsWith("/>") ? -2 : -1)
    .trim();
  return rawAttributes || undefined;
}

/**
 * Collects run subtrees that belong to this paragraph's inline flow. A run is
 * treated as an atomic source fragment, so drawings/text boxes nested inside it
 * are never traversed as separate paragraph runs.
 */
function collectParagraphRunXml(
  paragraphNode: XmlElement,
  serializer: XMLSerializer,
): string[] {
  const result: string[] = [];

  const visit = (container: XmlElement): void => {
    for (let index = 0; index < container.childNodes.length; index += 1) {
      const node = container.childNodes[index];
      if (node?.nodeType !== node.ELEMENT_NODE) {
        continue;
      }
      const element = node as XmlElement;
      if (element.namespaceURI === WORD_NS && element.localName === "r") {
        result.push(serializer.serializeToString(element));
        continue;
      }
      if (
        element.namespaceURI === WORD_NS &&
        (element.localName === "pPr" ||
          element.localName === "p" ||
          element.localName === "tbl" ||
          element.localName === "txbxContent")
      ) {
        continue;
      }
      visit(element);
    }
  };

  visit(paragraphNode);
  return result;
}

function captureImportedParagraphSource(
  paragraphNode: XmlElement,
  paragraphProperties: XmlElement | null,
  importedRuns: ImportedRun[],
): ImportedParagraphSource | undefined {
  const serializer = new XMLSerializer();
  const attributes = serializeShallowElementAttributes(
    paragraphNode,
    serializer,
  );
  const inlineSectionProperties = paragraphProperties
    ? getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "sectPr")
    : null;
  // Intermediate section breaks are rebuilt from the section model. Reusing a
  // whole source paragraph that still owns w:sectPr would duplicate the break.
  const xml = !inlineSectionProperties
    ? serializer.serializeToString(paragraphNode)
    : undefined;
  const paragraphPropertiesXml =
    paragraphProperties && !inlineSectionProperties
      ? serializer.serializeToString(paragraphProperties)
      : undefined;
  const collectedRunXml = collectParagraphRunXml(paragraphNode, serializer);
  const runXml =
    collectedRunXml.length === importedRuns.length
      ? collectedRunXml
      : undefined;

  if (!xml && !attributes && !paragraphPropertiesXml && !runXml) {
    return undefined;
  }
  return {
    ...(xml ? { xml } : {}),
    ...(attributes ? { attributes } : {}),
    ...(paragraphPropertiesXml ? { paragraphPropertiesXml } : {}),
    ...(runXml ? { runXml } : {}),
  };
}

/**
 * Converts an {@link ImportedRun} (the import-only optional bag) into the final
 * {@link EditorTextRun} discriminated union, deriving `kind` by the same
 * precedence the model uses. Footnote/endnote references stay as transient
 * `__imported*Ref` markers (their docxId is remapped to a document-local id by
 * the import driver once the notes parts are parsed); bookmark/comment markers
 * are likewise carried as transient props extracted later.
 */
function importedRunToEditorRun(run: ImportedRun): EditorTextRun {
  const base: EditorRunBase = {
    id: createEditorNodeId("run"),
    text: run.text,
  };
  if (run.styles) {
    base.styles = { ...run.styles };
  }

  let editorRun: EditorTextRun;
  if (run.fieldChar) {
    editorRun = { ...base, kind: "fieldChar", fieldChar: { ...run.fieldChar } };
  } else if (run.fieldInstruction !== undefined) {
    editorRun = {
      ...base,
      kind: "fieldInstruction",
      fieldInstruction: run.fieldInstruction,
    };
  } else if (run.field) {
    editorRun = { ...base, kind: "field", field: { ...run.field } };
  } else if (run.textBox) {
    editorRun = { ...base, kind: "textBox", textBox: run.textBox };
  } else if (run.image) {
    editorRun = { ...base, kind: "image", image: run.image };
  } else if (run.sym) {
    editorRun = { ...base, kind: "sym", sym: { ...run.sym } };
  } else {
    editorRun = { ...base, kind: "text" };
  }

  const withMarkers = editorRun as EditorTextRun & {
    __importedFootnoteRef?: { docxId: string; customMark?: string };
    __importedEndnoteRef?: { docxId: string; customMark?: string };
    __importedBookmark?: ImportedBookmarkMarker;
    __importedComment?: ImportedCommentMarker;
  };
  if (run.footnoteReference) {
    withMarkers.__importedFootnoteRef = { ...run.footnoteReference };
  }
  if (run.endnoteReference) {
    withMarkers.__importedEndnoteRef = { ...run.endnoteReference };
  }
  if (run.bookmark) {
    withMarkers.__importedBookmark = { ...run.bookmark };
  }
  if (run.comment) {
    withMarkers.__importedComment = { ...run.comment };
  }
  return withMarkers;
}

function createImportedParagraph(
  runs: ImportedRun[],
  paragraphStyle: EditorParagraphStyle | undefined,
  list: EditorParagraphListStyle | undefined,
  markRunStyle?: EditorTextStyle,
  source?: ImportedParagraphSource,
): EditorParagraphNode {
  const editorRuns: EditorTextRun[] =
    runs.length > 0
      ? runs.map(importedRunToEditorRun)
      : // An empty paragraph still carries the formatting of its paragraph mark
        // (`w:pPr/w:rPr`), which Word uses to render the blank line's font/size.
        // Apply it so empty lines match Word instead of falling back to defaults.
        [
          {
            id: createEditorNodeId("run"),
            text: "",
            kind: "text",
            ...(markRunStyle ? { styles: { ...markRunStyle } } : {}),
          },
        ];
  const paragraph: EditorParagraphNode = {
    id: createEditorNodeId("paragraph"),
    type: "paragraph",
    runs: editorRuns,
  };
  paragraph.style = paragraphStyle ? { ...paragraphStyle } : undefined;
  for (const run of paragraph.runs) {
    run.styles = normalizeImportedRunStyle(
      run.styles,
      paragraph.style?.styleId,
    );
  }
  paragraph.list = list ? { ...list } : undefined;

  if (source?.runXml?.length === paragraph.runs.length) {
    for (let index = 0; index < paragraph.runs.length; index += 1) {
      setEditorRunOoxmlSource(paragraph.runs[index]!, source.runXml[index]!);
    }
  }
  if (source) {
    setEditorParagraphOoxmlSource(paragraph, source);
  }
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
      !run.bookmark &&
      !run.comment
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
    parts.forEach((part, index): void => {
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
      run.comment ||
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
  parseNestedBlocks: ParseNestedBlocks,
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
    parseNestedBlocks,
  );
  const parsedStyle = withDocxImplicitSingleLineHeight(
    parseParagraphStyle(paragraphProperties, theme.colors),
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
    const source = captureImportedParagraphSource(
      paragraphNode,
      paragraphProperties,
      runs,
    );
    return {
      paragraphs: [
        createImportedParagraph(
          runs,
          paragraphStyle,
          list,
          markRunStyle,
          source,
        ),
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
  parseNestedBlocks: ParseNestedBlocks,
  inheritedStyle?: EditorParagraphStyle,
): Promise<EditorParagraphNode> {
  const parsed = await parseParagraphNodes(
    paragraphNode,
    numberingMaps,
    zip,
    relsMap,
    assets,
    theme,
    parseNestedBlocks,
    inheritedStyle,
  );
  return parsed.paragraphs[0] ?? createEditorParagraphFromRuns([{ text: "" }]);
}

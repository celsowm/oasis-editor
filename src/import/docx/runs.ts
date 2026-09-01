import JSZip from "jszip";
import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorTextStyle,
  EditorImageRunData,
  EditorTextBoxData,
  EditorRevision,
  EditorRunBase,
  EditorSdtBlockWrapper,
} from "@/core/model.js";
import { createEditorNodeId } from "@/core/editorState.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { MATH_NS, parseMathExpression } from "./math.js";
import { PAGE_BREAK_MARKER } from "./units.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { parseRunStyle } from "./runStyle.js";
import { parseSdtPr } from "./contentControls.js";
import type { NumberingMaps } from "./numbering.js";
import { parseDrawingImage } from "./runs/drawingImage.js";
import { parseVmlImage } from "./runs/vmlImage.js";
import {
  parseTextBox,
  resolveAlternateContentDrawing,
} from "./runs/textBox.js";
import type {
  ImportedBookmarkMarker,
  ImportedCommentMarker,
  ImportedRun,
  ParseNestedBlocks,
} from "./runs/types.js";

// Re-export public API — keeps paragraph.ts import compatible
export type { ImportedRun } from "./runs/types.js";
export type { ParseNestedBlocks } from "./runs/types.js";
export { getRunInstructionText } from "./runs/fields.js";

/**
 * Parse a `w:bookmarkStart` / `w:bookmarkEnd` element into a transient marker.
 * Returns `undefined` when the element has no usable `w:id`.
 */
function parseBookmarkMarker(
  element: XmlElement,
): ImportedBookmarkMarker | undefined {
  const docxId = getAttributeValue(element, "id");
  if (!docxId) {
    return undefined;
  }
  if (element.localName === "bookmarkEnd") {
    return { kind: "end", docxId };
  }
  const name = getAttributeValue(element, "name") ?? undefined;
  const colFirstRaw = getAttributeValue(element, "colFirst");
  const colLastRaw = getAttributeValue(element, "colLast");
  const colFirst =
    colFirstRaw !== null ? Number.parseInt(colFirstRaw, 10) : undefined;
  const colLast =
    colLastRaw !== null ? Number.parseInt(colLastRaw, 10) : undefined;
  return {
    kind: "start",
    docxId,
    ...(name !== undefined ? { name } : {}),
    ...(colFirst !== undefined && !Number.isNaN(colFirst) ? { colFirst } : {}),
    ...(colLast !== undefined && !Number.isNaN(colLast) ? { colLast } : {}),
  };
}

/**
 * Parse a `w:commentRangeStart` / `w:commentRangeEnd` element into a transient
 * marker. Returns `undefined` when the element has no usable `w:id`.
 */
function parseCommentMarker(
  element: XmlElement,
): ImportedCommentMarker | undefined {
  const docxId = getAttributeValue(element, "id");
  if (!docxId) {
    return undefined;
  }
  return {
    kind: element.localName === "commentRangeEnd" ? "end" : "start",
    docxId,
  };
}

function fallbackRevisionId(element: XmlElement): string {
  const xml = new XMLSerializer().serializeToString(element);
  let hash = 2166136261;
  for (let index = 0; index < xml.length; index += 1) {
    hash ^= xml.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `revision:${hash >>> 0}`;
}

function parseRevisionContainer(element: XmlElement): EditorRevision | undefined {
  const kind = element.localName;
  if (
    kind !== "ins" &&
    kind !== "del" &&
    kind !== "moveFrom" &&
    kind !== "moveTo"
  ) {
    return undefined;
  }

  const rawDate = getAttributeValue(element, "date");
  const parsedDate = rawDate ? Date.parse(rawDate) : Number.NaN;
  const isDeletion = kind === "del" || kind === "moveFrom";
  return {
    id: getAttributeValue(element, "id") ?? fallbackRevisionId(element),
    type: isDeletion ? "delete" : "insert",
    author: getAttributeValue(element, "author") ?? "Unknown",
    date: Number.isFinite(parsedDate) ? parsedDate : 0,
    ...(kind === "moveFrom"
      ? { move: "from" as const }
      : kind === "moveTo"
        ? { move: "to" as const }
        : {}),
  };
}

function parseMoveRangeMarker(
  element: XmlElement,
): EditorRunBase["revisionRangeMarker"] | undefined {
  const match = /^move(From|To)Range(Start|End)$/.exec(element.localName);
  if (!match) return undefined;

  const move = match[1] === "From" ? "from" : "to";
  const edge = match[2] === "Start" ? "start" : "end";
  const rawDate = getAttributeValue(element, "date");
  const parsedDate = rawDate ? Date.parse(rawDate) : Number.NaN;
  const colFirstRaw = getAttributeValue(element, "colFirst");
  const colLastRaw = getAttributeValue(element, "colLast");
  const columnFirst =
    colFirstRaw !== null ? Number.parseInt(colFirstRaw, 10) : Number.NaN;
  const columnLast =
    colLastRaw !== null ? Number.parseInt(colLastRaw, 10) : Number.NaN;
  const name = getAttributeValue(element, "name") ?? undefined;
  const author = getAttributeValue(element, "author") ?? undefined;
  const displacedByCustomXml =
    getAttributeValue(element, "displacedByCustomXml") ?? undefined;

  return {
    move,
    edge,
    id: getAttributeValue(element, "id") ?? fallbackRevisionId(element),
    ...(name !== undefined ? { name } : {}),
    ...(author !== undefined ? { author } : {}),
    ...(Number.isFinite(parsedDate) ? { date: parsedDate } : {}),
    ...(Number.isFinite(columnFirst) ? { columnFirst } : {}),
    ...(Number.isFinite(columnLast) ? { columnLast } : {}),
    ...(displacedByCustomXml !== undefined ? { displacedByCustomXml } : {}),
  };
}

export async function parseRunElement(
  runElement: XmlElement,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  parseNestedBlocks?: ParseNestedBlocks,
): Promise<{
  text: string;
  image?: EditorImageRunData;
  textBox?: EditorTextBoxData;
  innerBookmarks?: Array<{ offset: number; marker: ImportedBookmarkMarker }>;
  innerComments?: Array<{ offset: number; marker: ImportedCommentMarker }>;
  sym?: { font: string; char: string };
}> {
  const textParts: string[] = [];
  let image: EditorImageRunData | undefined;
  let textBox: EditorTextBoxData | undefined;
  let sym: { font: string; char: string } | undefined;
  let textLength = 0;
  const innerBookmarks: Array<{
    offset: number;
    marker: ImportedBookmarkMarker;
  }> = [];
  const innerComments: Array<{
    offset: number;
    marker: ImportedCommentMarker;
  }> = [];
  const pushText = (value: string): void => {
    textParts.push(value);
    textLength += value.length;
  };

  const children = runElement.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
    if (element.namespaceURI === WORD_NS) {
      if (element.localName === "t" || element.localName === "delText") {
        pushText(element.textContent ?? "");
      } else if (element.localName === "tab") {
        pushText("\t");
      } else if (element.localName === "noBreakHyphen") {
        pushText("\u2011");
      } else if (element.localName === "softHyphen") {
        pushText("\u00AD");
      } else if (element.localName === "br") {
        pushText(
          getAttributeValue(element, "type") === "page"
            ? PAGE_BREAK_MARKER
            : "\n",
        );
      } else if (element.localName === "lastRenderedPageBreak") {
        continue;
      } else if (
        element.localName === "bookmarkStart" ||
        element.localName === "bookmarkEnd"
      ) {
        const marker = parseBookmarkMarker(element);
        if (marker) {
          innerBookmarks.push({ offset: textLength, marker });
        }
        continue;
      } else if (
        element.localName === "commentRangeStart" ||
        element.localName === "commentRangeEnd"
      ) {
        const marker = parseCommentMarker(element);
        if (marker) {
          innerComments.push({ offset: textLength, marker });
        }
        continue;
      } else if (
        element.localName === "proofErr" ||
        element.localName === "commentReference" ||
        element.localName === "permStart" ||
        element.localName === "permEnd"
      ) {
        continue;
      } else if (element.localName === "cr") {
        pushText("\n");
      } else if (element.localName === "drawing") {
        const drawingResult = await parseDrawingImage(
          element,
          zip,
          relsMap,
          assets,
        );
        if (drawingResult.image) {
          pushText(drawingResult.text);
          image = drawingResult.image;
        } else {
          const parsedTextBox = await parseTextBox(element, parseNestedBlocks);
          if (parsedTextBox) {
            pushText("\uFFFC");
            textBox = parsedTextBox;
          }
        }
      } else if (element.localName === "pict") {
        const vmlResult = await parseVmlImage(element, zip, relsMap, assets);
        if (vmlResult) {
          pushText("\uFFFC");
          image = vmlResult;
        }
      } else if (element.localName === "sym") {
        const font = getAttributeValue(element, "font") ?? "";
        const charHex = getAttributeValue(element, "char") ?? "";
        const codePoint = parseInt(charHex, 16);
        const ch =
          Number.isFinite(codePoint) && codePoint > 0
            ? String.fromCodePoint(codePoint)
            : "?";
        pushText(ch);
        sym = { font, char: charHex };
      }
    } else if (element.localName === "AlternateContent") {
      const drawing = resolveAlternateContentDrawing(element);
      if (drawing) {
        const parsedTextBox = await parseTextBox(drawing, parseNestedBlocks);
        if (parsedTextBox) {
          pushText("\uFFFC");
          textBox = parsedTextBox;
        }
      }
    }
  }

  return {
    text: textParts.join(""),
    image,
    ...(textBox ? { textBox } : {}),
    ...(innerBookmarks.length > 0 ? { innerBookmarks } : {}),
    ...(innerComments.length > 0 ? { innerComments } : {}),
    ...(sym ? { sym } : {}),
  };
}

export async function parseRunsContainer(
  container: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  inheritedLink?: string | null,
  parseNestedBlocks?: ParseNestedBlocks,
): Promise<ImportedRun[]> {
  const runs: ImportedRun[] = [];
  const fieldStack: Array<{
    beginIndex: number;
    instruction: string;
    beginStyles?: EditorTextStyle;
  }> = [];

  const collapseFieldIfSimple = (entry: {
    beginIndex: number;
    instruction: string;
    beginStyles?: EditorTextStyle;
  }): void => {
    const fieldType = /\bNUMPAGES\b/i.test(entry.instruction)
      ? "NUMPAGES"
      : /\bPAGE\b/i.test(entry.instruction)
        ? "PAGE"
        : null;
    if (!fieldType) {
      return;
    }
    const span = runs.slice(entry.beginIndex);
    if (span.some((run): ImportedBookmarkMarker | undefined => run.bookmark)) {
      return;
    }
    const resultRuns = span.filter(
      (run): boolean => !run.fieldChar && run.fieldInstruction === undefined,
    );
    const displayText =
      resultRuns.map((run): string => run.text).join("") || "1";
    const styles =
      resultRuns.find((run): EditorTextStyle | undefined => run.styles)
        ?.styles ?? entry.beginStyles;
    runs.length = entry.beginIndex;
    runs.push({
      text: displayText,
      ...(styles ? { styles } : {}),
      field: { type: fieldType },
    });
  };

  const onFldChar = (el: XmlElement, runStyles?: EditorTextStyle): void => {
    const fldCharType = getAttributeValue(el, "fldCharType");
    const lock = getAttributeValue(el, "fldLock");
    const dirty = getAttributeValue(el, "dirty");
    const fieldLock = lock === "true" || lock === "1";
    const isDirty = dirty === "true" || dirty === "1";
    if (fldCharType === "begin") {
      runs.push({
        text: "",
        fieldChar: {
          kind: "begin",
          ...(fieldLock ? { fieldLock: true } : {}),
          ...(isDirty ? { dirty: true } : {}),
        },
        ...(runStyles ? { styles: runStyles } : {}),
      });
      fieldStack.push({
        beginIndex: runs.length - 1,
        instruction: "",
        ...(runStyles ? { beginStyles: runStyles } : {}),
      });
    } else if (fldCharType === "separate") {
      runs.push({
        text: "",
        fieldChar: { kind: "separate" },
        ...(runStyles ? { styles: runStyles } : {}),
      });
    } else if (fldCharType === "end") {
      runs.push({
        text: "",
        fieldChar: { kind: "end" },
        ...(runStyles ? { styles: runStyles } : {}),
      });
      const entry = fieldStack.pop();
      if (entry) {
        collapseFieldIfSimple(entry);
      }
    }
  };

  const onInstrText = (el: XmlElement, runStyles?: EditorTextStyle): void => {
    const text = el.textContent ?? "";
    runs.push({
      text: "",
      fieldInstruction: text,
      ...(runStyles ? { styles: runStyles } : {}),
    });
    const top = fieldStack[fieldStack.length - 1];
    if (top) {
      top.instruction += text;
    }
  };

  for (let index = 0; index < container.childNodes.length; index += 1) {
    const node = container.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
    if (
      element.namespaceURI === MATH_NS &&
      (element.localName === "oMath" || element.localName === "oMathPara")
    ) {
      runs.push({ text: "\uFFFC", math: parseMathExpression(element) });
      continue;
    }
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }

    if (
      element.localName === "bookmarkStart" ||
      element.localName === "bookmarkEnd"
    ) {
      const marker = parseBookmarkMarker(element);
      if (!marker) {
        continue;
      }
      runs.push({ text: "", bookmark: marker });
      continue;
    }

    if (
      element.localName === "commentRangeStart" ||
      element.localName === "commentRangeEnd"
    ) {
      const marker = parseCommentMarker(element);
      if (!marker) {
        continue;
      }
      runs.push({ text: "", comment: marker });
      continue;
    }

    const moveRangeMarker = parseMoveRangeMarker(element);
    if (moveRangeMarker) {
      runs.push({ text: "", revisionRangeMarker: moveRangeMarker });
      continue;
    }

    const revision = parseRevisionContainer(element);
    if (revision) {
      const nestedRuns = await parseRunsContainer(
        element,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
        inheritedLink,
        parseNestedBlocks,
      );
      for (const nestedRun of nestedRuns) {
        runs.push({
          ...nestedRun,
          revision: nestedRun.revision ?? revision,
        });
      }
      continue;
    }

    if (element.localName === "sdt") {
      const sdtContent = getFirstChildByTagNameNS(element, WORD_NS, "sdtContent");
      if (!sdtContent) {
        continue;
      }
      const sdtPr = getFirstChildByTagNameNS(element, WORD_NS, "sdtPr");
      const sdtEndPr = getFirstChildByTagNameNS(element, WORD_NS, "sdtEndPr");
      const wrapper: EditorSdtBlockWrapper = {
        groupId: createEditorNodeId("sdt"),
        sdtPr: parseSdtPr(sdtPr),
        ...(sdtEndPr
          ? { sdtEndPrXml: new XMLSerializer().serializeToString(sdtEndPr) }
          : {}),
      };
      const nestedRuns = await parseRunsContainer(
        sdtContent,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
        inheritedLink,
        parseNestedBlocks,
      );
      for (const nestedRun of nestedRuns) {
        runs.push({
          ...nestedRun,
          sdtWrappers: [wrapper, ...(nestedRun.sdtWrappers ?? [])],
        });
      }
      continue;
    }

    if (element.localName === "r") {
      const runStyles = parseRunStyle(
        getFirstChildByTagNameNS(element, WORD_NS, "rPr"),
        theme,
      );

      const hasFieldControl =
        getChildrenByTagNameNS(element, WORD_NS, "fldChar").length > 0 ||
        getChildrenByTagNameNS(element, WORD_NS, "instrText").length > 0 ||
        getChildrenByTagNameNS(element, WORD_NS, "delInstrText").length > 0;
      if (hasFieldControl) {
        for (let child = 0; child < element.childNodes.length; child += 1) {
          const childNode = element.childNodes[child];
          if (childNode?.nodeType !== childNode.ELEMENT_NODE) {
            continue;
          }
          const childElement = childNode as XmlElement;
          if (childElement.namespaceURI !== WORD_NS) {
            continue;
          }
          if (childElement.localName === "fldChar") {
            onFldChar(childElement, runStyles);
          } else if (
            childElement.localName === "instrText" ||
            childElement.localName === "delInstrText"
          ) {
            onInstrText(childElement, runStyles);
          }
        }
        continue;
      }

      const footnoteRefEl = getFirstChildByTagNameNS(
        element,
        WORD_NS,
        "footnoteReference",
      );
      if (footnoteRefEl) {
        const docxId = getAttributeValue(footnoteRefEl, "id");
        if (!docxId) {
          continue;
        }
        const customMark = getAttributeValue(
          footnoteRefEl,
          "customMarkFollows",
        );
        let styles = runStyles;
        (styles ??= {}).styleId ??= "footnoteReference";
        if (styles.superscript === undefined) styles.superscript = true;
        runs.push({
          text: "?",
          styles,
          footnoteReference: {
            docxId,
            ...(customMark ? { customMark } : {}),
          },
        });
        continue;
      }

      const endnoteRefEl = getFirstChildByTagNameNS(
        element,
        WORD_NS,
        "endnoteReference",
      );
      if (endnoteRefEl) {
        const docxId = getAttributeValue(endnoteRefEl, "id");
        if (!docxId) {
          continue;
        }
        const customMark = getAttributeValue(endnoteRefEl, "customMarkFollows");
        let styles = runStyles;
        (styles ??= {}).styleId ??= "endnoteReference";
        if (styles.superscript === undefined) styles.superscript = true;
        runs.push({
          text: "?",
          styles,
          endnoteReference: {
            docxId,
            ...(customMark ? { customMark } : {}),
          },
        });
        continue;
      }

      const { text, image, textBox, innerBookmarks, innerComments, sym } =
        await parseRunElement(element, zip, relsMap, assets, parseNestedBlocks);

      let styles = runStyles;
      if (sym && !styles?.fontFamily) {
        (styles ??= {}).fontFamily = sym.font;
      }
      if (inheritedLink) {
        (styles ??= {}).link = inheritedLink;
      }

      const innerMarkers: Array<{ offset: number; run: ImportedRun }> = [
        ...(innerBookmarks ?? []).map(
          (m): { offset: number; run: ImportedRun } => ({
            offset: m.offset,
            run: { text: "", bookmark: m.marker } as ImportedRun,
          }),
        ),
        ...(innerComments ?? []).map(
          (m): { offset: number; run: ImportedRun } => ({
            offset: m.offset,
            run: { text: "", comment: m.marker } as ImportedRun,
          }),
        ),
      ];
      if (innerMarkers.length > 0 && !image && !textBox) {
        innerMarkers.sort((a, b): number => a.offset - b.offset);
        let cursor = 0;
        for (const inner of innerMarkers) {
          const segment = text.slice(cursor, inner.offset);
          if (segment.length > 0) {
            runs.push({ text: segment, ...(styles ? { styles } : {}) });
          }
          runs.push(inner.run);
          cursor = inner.offset;
        }
        const tail = text.slice(cursor);
        if (tail.length > 0) {
          runs.push({ text: tail, ...(styles ? { styles } : {}) });
        }
        continue;
      }

      if (text.length === 0 && !image && !textBox) {
        continue;
      }
      runs.push({
        text,
        ...(image ? { image } : {}),
        ...(textBox ? { textBox } : {}),
        ...(sym ? { sym } : {}),
        ...(styles ? { styles } : {}),
      });
      if (innerBookmarks) {
        for (const inner of innerBookmarks) {
          runs.push({ text: "", bookmark: inner.marker });
        }
      }
      continue;
    }

    if (element.localName === "fldSimple") {
      const instr =
        element.getAttribute("w:instr") ??
        element.getAttributeNS(WORD_NS, "instr") ??
        element.getAttribute("instr") ??
        "";
      const fieldType = /\bNUMPAGES\b/i.test(instr)
        ? "NUMPAGES"
        : /\bPAGE\b/i.test(instr)
          ? "PAGE"
          : null;
      const fieldRuns = await parseRunsContainer(
        element,
        numberingMaps,
        zip,
        relsMap,
        assets,
        theme,
        inheritedLink,
        parseNestedBlocks,
      );
      if (fieldType) {
        const displayText =
          fieldRuns.map((run): string => run.text).join("") || "1";
        const styles = fieldRuns.find(
          (run): EditorTextStyle | undefined => run.styles,
        )?.styles;
        runs.push({
          text: displayText,
          styles,
          field: { type: fieldType },
        });
      } else {
        runs.push({ text: "", fieldChar: { kind: "begin" } });
        runs.push({ text: "", fieldInstruction: instr });
        runs.push({ text: "", fieldChar: { kind: "separate" } });
        runs.push(...fieldRuns);
        runs.push({ text: "", fieldChar: { kind: "end" } });
      }
      continue;
    }

    if (element.localName === "hyperlink") {
      let href =
        relsMap.get(
          element.getAttribute("r:id") ??
            element.getAttributeNS(
              "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
              "id",
            ) ??
            "",
        ) ?? null;

      if (!href) {
        const anchor = getAttributeValue(element, "anchor");
        if (anchor) href = `#${anchor}`;
      }
      runs.push(
        ...(await parseRunsContainer(
          element,
          numberingMaps,
          zip,
          relsMap,
          assets,
          theme,
          href,
          parseNestedBlocks,
        )),
      );
    }
  }

  return runs;
}

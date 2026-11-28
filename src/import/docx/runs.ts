import {
  canProjectFieldResult,
  inspectScalarFieldSpan,
} from "./runs/fieldPreservation.js";
import { projectOpaqueRunElement } from "@/ooxml/word/opaqueObjects.js";
import JSZip from "jszip";
import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import { projectScalarFieldInstruction } from "./runs/fieldProjection.js";
import { parseFfData } from "@/ooxml/word/legacyFormFields.js";
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
import { COLUMN_BREAK_MARKER, PAGE_BREAK_MARKER } from "./units.js";
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

function parseRevisionContainer(
  element: XmlElement,
): EditorRevision | undefined {
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
  const match = /^move(From|To)Range(Start|End)$/.exec(element.localName ?? "");
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
  // Ordered mixed-run import parses selected children without detaching them
  // from the source DOM or losing their inherited namespace context.
  selectedChildren?: readonly XmlElement[],
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

  const children = selectedChildren ?? runElement.childNodes;
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
        const brType = getAttributeValue(element, "type");
        pushText(
          brType === "page"
            ? PAGE_BREAK_MARKER
            : brType === "column"
              ? COLUMN_BREAK_MARKER
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
    nested: boolean;
  }> = [];

  const collapseFieldIfSimple = (entry: {
    beginIndex: number;
    instruction: string;
    beginStyles?: EditorTextStyle;
    nested: boolean;
  }): void => {
    if (entry.nested) return;
    const field = projectScalarFieldInstruction(entry.instruction);
    if (!field) return;
    const span = runs.slice(entry.beginIndex);
    const resultRuns = inspectScalarFieldSpan(span);
    if (!resultRuns) return;
    const displayText =
      resultRuns.map((run): string => run.text).join("") || "1";
    const styles =
      resultRuns.find((run): EditorTextStyle | undefined => run.styles)
        ?.styles ?? entry.beginStyles;
    runs.length = entry.beginIndex;
    runs.push({
      text: displayText,
      ...(styles ? { styles } : {}),
      field,
    });
  };

  const onFldChar = (el: XmlElement, runStyles?: EditorTextStyle): void => {
    const fldCharType = getAttributeValue(el, "fldCharType");
    const lock = getAttributeValue(el, "fldLock");
    const dirty = getAttributeValue(el, "dirty");
    const fieldLock = lock === "true" || lock === "1" || lock === "on";
    const isDirty = dirty === "true" || dirty === "1" || dirty === "on";
    if (fldCharType === "begin") {
      const nested = fieldStack.length > 0;
      for (const parent of fieldStack) parent.nested = true;
      let formField:
        import("@/core/model.js").EditorLegacyFormFieldData | undefined;
      for (let i = 0; i < el.childNodes.length; i++) {
        const node = el.childNodes.item(i);
        if (
          node?.nodeType === 1 &&
          (node as XmlElement).localName === "ffData" &&
          (node as XmlElement).namespaceURI === WORD_NS
        )
          formField = parseFfData(node as XmlElement);
      }
      runs.push({
        text: "",
        fieldChar: {
          kind: "begin",
          ...(fieldLock ? { fieldLock: true } : {}),
          ...(isDirty ? { dirty: true } : {}),
          ...(formField ? { formField } : {}),
        },
        ...(runStyles ? { styles: runStyles } : {}),
      });
      fieldStack.push({
        beginIndex: runs.length - 1,
        instruction: "",
        nested,
        ...(runStyles ? { beginStyles: runStyles } : {}),
      });
    } else if (fldCharType === "separate") {
      runs.push({
        text: "",
        fieldChar: {
          kind: "separate",
          ...(fieldLock ? { fieldLock: true } : {}),
          ...(isDirty ? { dirty: true } : {}),
        },
        ...(runStyles ? { styles: runStyles } : {}),
      });
    } else if (fldCharType === "end") {
      runs.push({
        text: "",
        fieldChar: {
          kind: "end",
          ...(fieldLock ? { fieldLock: true } : {}),
          ...(isDirty ? { dirty: true } : {}),
        },
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
      const sdtContent = getFirstChildByTagNameNS(
        element,
        WORD_NS,
        "sdtContent",
      );
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

      const contentChildren = Array.from(element.childNodes).filter(
        (node): node is XmlElement =>
          node.nodeType === 1 &&
          !(node.namespaceURI === WORD_NS && node.localName === "rPr"),
      );
      // Project direct children in document order when an opaque object is
      // mixed with understood text, native inline content or range markers.
      // Never detach an opaque element from its source namespace scope.
      const projected = contentChildren.map((child) => ({
        child,
        opaque: projectOpaqueRunElement(child),
      }));
      const textChild = (child: XmlElement): boolean =>
        child.namespaceURI === WORD_NS &&
        [
          "t",
          "delText",
          "tab",
          "noBreakHyphen",
          "softHyphen",
          "br",
          "cr",
          "lastRenderedPageBreak",
        ].includes(child.localName ?? "");
      const structuredChild = (child: XmlElement): boolean =>
        (child.namespaceURI === WORD_NS &&
          [
            "drawing",
            "pict",
            "sym",
            "bookmarkStart",
            "bookmarkEnd",
            "commentRangeStart",
            "commentRangeEnd",
          ].includes(child.localName ?? "")) ||
        (child.namespaceURI ===
          "http://schemas.openxmlformats.org/markup-compatibility/2006" &&
          child.localName === "AlternateContent");
      const containsOpaque = projected.some((entry) => entry.opaque);
      if (
        containsOpaque &&
        (contentChildren.length === 1 ||
          (!fieldStack.length &&
            projected.every(
              (entry) =>
                entry.opaque ||
                textChild(entry.child) ||
                structuredChild(entry.child),
            )))
      ) {
        let text = "";
        const styles = inheritedLink
          ? { ...runStyles, link: inheritedLink }
          : runStyles;
        const flush = (): void => {
          if (!text.length) return;
          runs.push({ text, ...(styles ? { styles: { ...styles } } : {}) });
          text = "";
        };
        for (const { child, opaque } of projected) {
          if (opaque) {
            flush();
            runs.push({
              text: "\uFFFC",
              opaque,
              ...(styles ? { styles: { ...styles } } : {}),
            });
            continue;
          }
          if (structuredChild(child)) {
            flush();
            const native = await parseRunElement(
              element,
              zip,
              relsMap,
              assets,
              parseNestedBlocks,
              [child],
            );
            // The reused native parser returns at most one object or marker
            // for this single source child. Preserve its position, not the
            // last image encountered in the entire run.
            for (const marker of native.innerBookmarks ?? []) {
              runs.push({ text: "", bookmark: marker.marker });
            }
            for (const marker of native.innerComments ?? []) {
              runs.push({ text: "", comment: marker.marker });
            }
            if (native.text.length || native.image || native.textBox) {
              const nativeStyles =
                native.sym && !styles?.fontFamily
                  ? { ...styles, fontFamily: native.sym.font }
                  : styles;
              runs.push({
                text: native.text,
                ...(native.image ? { image: native.image } : {}),
                ...(native.textBox ? { textBox: native.textBox } : {}),
                ...(native.sym ? { sym: native.sym } : {}),
                ...(nativeStyles ? { styles: { ...nativeStyles } } : {}),
              });
            }
            continue;
          }
          switch (child.localName) {
            case "t":
            case "delText":
              text += child.textContent ?? "";
              break;
            case "tab":
              text += "\t";
              break;
            case "noBreakHyphen":
              text += "\u2011";
              break;
            case "softHyphen":
              text += "\u00AD";
              break;
            case "cr":
              text += "\n";
              break;
            case "br": {
              const type = getAttributeValue(child, "type");
              text +=
                type === "page"
                  ? PAGE_BREAK_MARKER
                  : type === "column"
                    ? COLUMN_BREAK_MARKER
                    : "\n";
              break;
            }
          }
        }
        flush();
        continue;
      }

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
          } else if (textChild(childElement)) {
            const native = await parseRunElement(
              element,
              zip,
              relsMap,
              assets,
              parseNestedBlocks,
              [childElement],
            );
            if (native.text.length)
              runs.push({
                text: native.text,
                ...(runStyles ? { styles: { ...runStyles } } : {}),
              });
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
      const field = projectScalarFieldInstruction(instr);
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
      const lock = getAttributeValue(element, "fldLock");
      const dirty = getAttributeValue(element, "dirty");
      const fieldLock = lock === "true" || lock === "1" || lock === "on";
      const isDirty = dirty === "true" || dirty === "1" || dirty === "on";
      if (
        field &&
        !fieldLock &&
        !isDirty &&
        !fieldStack.length &&
        canProjectFieldResult(fieldRuns)
      ) {
        const displayText =
          fieldRuns.map((run): string => run.text).join("") || "1";
        const styles = fieldRuns.find(
          (run): EditorTextStyle | undefined => run.styles,
        )?.styles;
        runs.push({
          text: displayText,
          styles,
          field,
        });
      } else {
        for (const parent of fieldStack) parent.nested = true;
        runs.push({
          text: "",
          fieldChar: {
            kind: "begin",
            ...(fieldLock ? { fieldLock: true } : {}),
            ...(isDirty ? { dirty: true } : {}),
          },
        });
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

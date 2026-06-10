import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorTextStyle,
  EditorImageRunData,
  EditorTextBoxData,
} from "../../core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { PAGE_BREAK_MARKER } from "./units.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { parseRunStyle } from "./runStyle.js";
import type { NumberingMaps } from "./numbering.js";
import { getRunInstructionText } from "./runs/fields.js";
import { parseDrawingImage } from "./runs/drawingImage.js";
import { parseVmlImage } from "./runs/vmlImage.js";
import { parseTextBox, resolveAlternateContentDrawing } from "./runs/textBox.js";
import type { ImportedRun, ParseNestedBlocks } from "./runs/types.js";

// Re-export public API — keeps paragraph.ts import compatible
export type { ImportedRun } from "./runs/types.js";
export type { ParseNestedBlocks } from "./runs/types.js";
export { getRunInstructionText } from "./runs/fields.js";

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
}> {
  const textParts: string[] = [];
  let image: EditorImageRunData | undefined;
  let textBox: EditorTextBoxData | undefined;

  const children = runElement.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
    if (element.namespaceURI === WORD_NS) {
      if (element.localName === "t") {
        textParts.push(element.textContent ?? "");
      } else if (element.localName === "tab") {
        textParts.push("\t");
      } else if (element.localName === "noBreakHyphen") {
        textParts.push("\u2011");
      } else if (element.localName === "softHyphen") {
        textParts.push("\u00AD");
      } else if (element.localName === "br") {
        textParts.push(
          getAttributeValue(element, "type") === "page"
            ? PAGE_BREAK_MARKER
            : "\n",
        );
      } else if (element.localName === "lastRenderedPageBreak") {
        continue;
      } else if (
        element.localName === "proofErr" ||
        element.localName === "bookmarkStart" ||
        element.localName === "bookmarkEnd" ||
        element.localName === "commentRangeStart" ||
        element.localName === "commentRangeEnd" ||
        element.localName === "commentReference" ||
        element.localName === "permStart" ||
        element.localName === "permEnd"
      ) {
        continue;
      } else if (element.localName === "cr") {
        textParts.push("\n");
      } else if (element.localName === "drawing") {
        const drawingResult = await parseDrawingImage(element, zip, relsMap, assets);
        if (drawingResult.image) {
          textParts.push(drawingResult.text);
          image = drawingResult.image;
        } else {
          const parsedTextBox = await parseTextBox(element, parseNestedBlocks);
          if (parsedTextBox) {
            textParts.push("\uFFFC");
            textBox = parsedTextBox;
          }
        }
      } else if (element.localName === "pict") {
        const vmlResult = await parseVmlImage(element, zip, relsMap, assets);
        if (vmlResult) {
          textParts.push("\uFFFC");
          image = vmlResult;
        }
      }
    } else if (element.localName === "AlternateContent") {
      const drawing = resolveAlternateContentDrawing(element);
      if (drawing) {
        const parsedTextBox = await parseTextBox(drawing, parseNestedBlocks);
        if (parsedTextBox) {
          textParts.push("\uFFFC");
          textBox = parsedTextBox;
        }
      }
    }
  }

  return {
    text: textParts.join(""),
    image,
    ...(textBox ? { textBox } : {}),
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
  let activeField: {
    instruction: string;
    resultRuns: ImportedRun[];
    collectingResult: boolean;
    fallbackStyles?: EditorTextStyle;
  } | null = null;

  const flushActiveField = () => {
    if (!activeField) {
      return;
    }
    const instruction = activeField.instruction;
    const fieldType = /\bNUMPAGES\b/i.test(instruction)
      ? "NUMPAGES"
      : /\bPAGE\b/i.test(instruction)
        ? "PAGE"
        : null;
    const displayText =
      activeField.resultRuns.map((run) => run.text).join("") || "1";
    const styles =
      activeField.resultRuns.find((run) => run.styles)?.styles ??
      activeField.fallbackStyles;
    runs.push({
      text: displayText,
      styles,
      ...(fieldType ? { field: { type: fieldType } } : {}),
    });
    activeField = null;
  };

  for (let index = 0; index < container.childNodes.length; index += 1) {
    const node = container.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }

    const element = node as XmlElement;
    if (element.namespaceURI !== WORD_NS) {
      continue;
    }

    if (element.localName === "r") {
      const fieldChars = getChildrenByTagNameNS(element, WORD_NS, "fldChar");
      if (fieldChars.length > 0) {
        const runStyles = parseRunStyle(
          getFirstChildByTagNameNS(element, WORD_NS, "rPr"),
          theme,
        );
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
            const fldCharType = getAttributeValue(childElement, "fldCharType");
            if (fldCharType === "begin") {
              flushActiveField();
              activeField = {
                instruction: "",
                resultRuns: [],
                collectingResult: false,
                ...(runStyles ? { fallbackStyles: runStyles } : {}),
              };
            } else if (fldCharType === "separate") {
              if (activeField) {
                activeField.collectingResult = true;
              }
            } else if (fldCharType === "end") {
              flushActiveField();
            }
          } else if (childElement.localName === "instrText") {
            if (activeField && !activeField.collectingResult) {
              activeField.instruction += childElement.textContent ?? "";
            }
          }
        }
        continue;
      }

      if (activeField) {
        const instructionText = getRunInstructionText(element);
        if (instructionText) {
          activeField.instruction += instructionText;
          continue;
        }
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
        let styles = parseRunStyle(
          getFirstChildByTagNameNS(element, WORD_NS, "rPr"),
          theme,
        );
        (styles ??= {}).styleId ??= "footnoteReference";
        if (styles.superscript === undefined) styles.superscript = true;
        const importedRun: ImportedRun = {
          text: "?",
          styles,
          footnoteReference: {
            docxId,
            ...(customMark ? { customMark } : {}),
          },
        };
        if (activeField?.collectingResult) {
          activeField.resultRuns.push(importedRun);
        } else {
          runs.push(importedRun);
        }
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
        const customMark = getAttributeValue(
          endnoteRefEl,
          "customMarkFollows",
        );
        let styles = parseRunStyle(
          getFirstChildByTagNameNS(element, WORD_NS, "rPr"),
          theme,
        );
        (styles ??= {}).styleId ??= "endnoteReference";
        if (styles.superscript === undefined) styles.superscript = true;
        const importedRun: ImportedRun = {
          text: "?",
          styles,
          endnoteReference: {
            docxId,
            ...(customMark ? { customMark } : {}),
          },
        };
        if (activeField?.collectingResult) {
          activeField.resultRuns.push(importedRun);
        } else {
          runs.push(importedRun);
        }
        continue;
      }

      const { text, image, textBox } = await parseRunElement(
        element,
        zip,
        relsMap,
        assets,
        parseNestedBlocks,
      );
      if (text.length === 0) {
        continue;
      }

      let styles = parseRunStyle(
        getFirstChildByTagNameNS(element, WORD_NS, "rPr"),
        theme,
      );
      if (inheritedLink) {
        (styles ??= {}).link = inheritedLink;
      }
      const importedRun: ImportedRun = {
        text,
        ...(image ? { image } : {}),
        ...(textBox ? { textBox } : {}),
        ...(styles ? { styles } : {}),
      };
      if (activeField?.collectingResult) {
        activeField.resultRuns.push(importedRun);
      } else {
        runs.push(importedRun);
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
      const displayText = fieldRuns.map((run) => run.text).join("") || "1";
      const styles = fieldRuns.find((run) => run.styles)?.styles;
      runs.push({
        text: displayText,
        styles,
        ...(fieldType ? { field: { type: fieldType } } : {}),
      });
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

  flushActiveField();

  return runs;
}

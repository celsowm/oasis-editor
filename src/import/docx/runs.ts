import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorTextStyle, EditorImageRunData } from "../../core/model.js";
import { imageMimeFromPath } from "../../utils/imageFormats.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  findElementDeep,
} from "./xmlHelpers.js";
import { PAGE_BREAK_MARKER } from "./units.js";
import { type AssetRegistry, registerImageAsset } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { parseRunStyle } from "./runStyle.js";
import type { NumberingMaps } from "./numbering.js";

const EMU_PER_PX = 9525;
const OOXML_PERCENT_DENOMINATOR = 100000;
const OOXML_ROTATION_UNITS = 60000;

/** Parse a DrawingML `a:srcRect` crop into normalized 0..1 fractions. */
function parseSrcRect(picPic: XmlElement): EditorImageRunData["crop"] {
  const srcRect = findElementDeep(picPic, "srcRect");
  if (!srcRect) {
    return undefined;
  }
  const toFraction = (name: string): number | undefined => {
    const raw = srcRect.getAttribute(name);
    if (raw === null || raw === "") {
      return undefined;
    }
    const value = parseInt(raw, 10);
    if (!Number.isFinite(value) || value === 0) {
      return undefined;
    }
    return value / OOXML_PERCENT_DENOMINATOR;
  };
  const crop = {
    left: toFraction("l"),
    top: toFraction("t"),
    right: toFraction("r"),
    bottom: toFraction("b"),
  };
  if (
    crop.left === undefined &&
    crop.top === undefined &&
    crop.right === undefined &&
    crop.bottom === undefined
  ) {
    return undefined;
  }
  return crop;
}

/** Parse the picture fill mode from `pic:blipFill` (`a:tile` vs `a:stretch`). */
function parseFillMode(picPic: XmlElement): EditorImageRunData["fillMode"] {
  if (findElementDeep(picPic, "tile")) {
    return "tile";
  }
  return undefined;
}

/** Parse a DrawingML `a:xfrm` transform (rotation/flip) from `pic:spPr`. */
function parseXfrm(picPic: XmlElement): {
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
} {
  const xfrm = findElementDeep(picPic, "xfrm");
  if (!xfrm) {
    return {};
  }
  const result: { rotation?: number; flipH?: boolean; flipV?: boolean } = {};
  const rot = xfrm.getAttribute("rot");
  if (rot) {
    const value = parseInt(rot, 10);
    if (Number.isFinite(value) && value !== 0) {
      result.rotation = value / OOXML_ROTATION_UNITS;
    }
  }
  const flipH = xfrm.getAttribute("flipH");
  if (flipH === "1" || flipH === "true") {
    result.flipH = true;
  }
  const flipV = xfrm.getAttribute("flipV");
  if (flipV === "1" || flipV === "true") {
    result.flipV = true;
  }
  return result;
}

export interface ImportedRun {
  text: string;
  image?: EditorImageRunData;
  styles?: EditorTextStyle;
  field?: { type: "PAGE" | "NUMPAGES" };
  /**
   * When present, the run is an inline footnote reference. The DOCX `w:id`
   * is carried verbatim so a later pass can remap it to a real footnote id.
   * `text` is the placeholder marker (numbering is resolved post-parse).
   */
  footnoteReference?: { docxId: string; customMark?: string };
}

export async function parseRunElement(
  runElement: XmlElement,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
): Promise<{
  text: string;
  image?: EditorImageRunData;
}> {
  const textParts: string[] = [];
  let image: EditorImageRunData | undefined;

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
        // Word writes this as cached layout information. It is not an authored
        // hard page break and should not become pageBreakBefore on import.
        continue;
      } else if (element.localName === "cr") {
        textParts.push("\n");
      } else if (element.localName === "drawing") {
        const blip = findElementDeep(element, "blip");
        if (blip) {
          let embed = null;
          for (let i = 0; i < blip.attributes.length; i++) {
            const attr = blip.attributes[i];
            if (
              attr &&
              (attr.localName === "embed" ||
                attr.name === "r:embed" ||
                attr.name === "embed")
            ) {
              embed = attr.value;
              break;
            }
          }
          if (embed) {
            const target = relsMap.get(embed);
            if (target) {
              let zipPath = target;
              if (zipPath.startsWith("/")) zipPath = zipPath.slice(1);
              if (!zipPath.startsWith("word/")) zipPath = "word/" + target;
              const file = zip.file(zipPath);
              // Unknown extensions fall back to PNG so the data URL stays
              // loadable; preserving the original binary still round-trips.
              const mime = imageMimeFromPath(target) ?? "image/png";
              const base64 = await file?.async("base64");
              if (base64) {
                textParts.push("\uFFFC");
                const extent = findElementDeep(element, "extent");
                const docPr = findElementDeep(element, "docPr");
                let width = 300;
                let height = 300;
                if (extent) {
                  const cx = extent.getAttribute("cx");
                  const cy = extent.getAttribute("cy");
                  if (cx) width = Math.round(parseInt(cx, 10) / EMU_PER_PX);
                  if (cy) height = Math.round(parseInt(cy, 10) / EMU_PER_PX);
                }
                const alt = docPr
                  ? (getAttributeValue(docPr, "descr") ??
                    getAttributeValue(docPr, "title"))
                  : null;
                const crop = parseSrcRect(element);
                const fillMode = parseFillMode(element);
                const xfrm = parseXfrm(element);
                // Store the heavy base64 payload in the document's asset
                // registry exactly once and reference it from the run.
                // Without this, every clone/equality check/signature pass
                // would have to walk a multi-hundred-KB string per keystroke.
                const assetSrc = registerImageAsset(
                  assets,
                  zipPath,
                  `data:${mime};base64,${base64}`,
                );
                image = {
                  src: assetSrc,
                  width,
                  height,
                  ...(alt !== null ? { alt } : {}),
                  ...(crop ? { crop } : {}),
                  ...(fillMode ? { fillMode } : {}),
                  ...(xfrm.rotation !== undefined
                    ? { rotation: xfrm.rotation }
                    : {}),
                  ...(xfrm.flipH ? { flipH: true } : {}),
                  ...(xfrm.flipV ? { flipV: true } : {}),
                };
              }
            }
          }
        }
      }
    }
  }

  return { text: textParts.join(""), image };
}

export function getRunInstructionText(runElement: XmlElement): string {
  return getChildrenByTagNameNS(runElement, WORD_NS, "instrText")
    .map((element) => element.textContent ?? "")
    .join("");
}

export async function parseRunsContainer(
  container: XmlElement,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  inheritedLink?: string | null,
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
      // A single <w:r> can carry several field-control children at once — some
      // generators emit begin + instrText + end inside one run instead of one
      // run per role. Walk the field children in document order so every
      // transition is observed; reading only the first fldChar would drop the
      // instruction (e.g. PAGE) and leave the field unrecognized.
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

      // Detect a footnote reference child element. It is mutually exclusive
      // with normal text/image content inside the run.
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
        // Default to superscript marker styling when the run does not specify it.
        (styles ??= {}).styleId ??= "footnoteReference";
        if (styles.superscript === undefined) styles.superscript = true;
        const importedRun: ImportedRun = {
          // Placeholder marker; resolved to a real number after import.
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

      const { text, image } = await parseRunElement(
        element,
        zip,
        relsMap,
        assets,
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
      const importedRun = { text, image, styles };
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
        )),
      );
    }
  }

  flushActiveField();

  return runs;
}

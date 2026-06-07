import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorTextStyle,
  EditorImageFloatingLayout,
  EditorImageFloatingPosition,
  EditorImageRunData,
} from "../../core/model.js";
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
const VML_FRACTION_DENOMINATOR = 65536;
const PX_PER_INCH = 96;
const PX_PER_POINT = PX_PER_INCH / 72;

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

/** Extract the `r:embed` and `r:link` relationship ids from an `a:blip`. */
function parseBlipRels(blip: XmlElement): { embed?: string; link?: string } {
  const result: { embed?: string; link?: string } = {};
  for (let i = 0; i < blip.attributes.length; i += 1) {
    const attr = blip.attributes[i];
    if (!attr) {
      continue;
    }
    if (attr.localName === "embed" || attr.name === "r:embed") {
      result.embed = attr.value;
    } else if (attr.localName === "link" || attr.name === "r:link") {
      result.link = attr.value;
    }
  }
  return result;
}

/** True when a relationship target is an absolute URI (external link). */
function isAbsoluteUri(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(target) || target.startsWith("//");
}

function parseRelationshipId(element: XmlElement): string | undefined {
  for (let i = 0; i < element.attributes.length; i += 1) {
    const attr = element.attributes[i];
    if (!attr) {
      continue;
    }
    if (attr.localName === "id" || attr.name === "r:id") {
      return attr.value;
    }
  }
  return undefined;
}

function findDrawingContainer(
  drawing: XmlElement,
): { element: XmlElement; kind: "inline" | "anchor" } | undefined {
  for (let index = 0; index < drawing.childNodes.length; index += 1) {
    const node = drawing.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node as XmlElement;
    if (element.localName === "inline" || element.localName === "anchor") {
      return { element, kind: element.localName };
    }
  }
  return undefined;
}

function parseOptionalInt(
  value: string | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseAnchorBoolean(
  value: string | null | undefined,
): boolean | undefined {
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return undefined;
}

function parseAnchorPosition(
  anchor: XmlElement,
  localName: "positionH" | "positionV",
): EditorImageFloatingPosition | undefined {
  const element = findElementDeep(anchor, localName);
  if (!element) {
    return undefined;
  }
  const align = findElementDeep(element, "align")?.textContent?.trim();
  const offsetText = findElementDeep(element, "posOffset")?.textContent?.trim();
  const offset = parseOptionalInt(offsetText);
  const position = {
    relativeFrom: element.getAttribute("relativeFrom") ?? undefined,
    ...(align ? { align } : {}),
    ...(offset !== undefined ? { offset } : {}),
  };
  if (
    position.relativeFrom === undefined &&
    position.align === undefined &&
    position.offset === undefined
  ) {
    return undefined;
  }
  return position;
}

function parseAnchorWrap(
  anchor: XmlElement,
): EditorImageFloatingLayout["wrap"] {
  if (findElementDeep(anchor, "wrapSquare")) return "square";
  if (findElementDeep(anchor, "wrapTight")) return "tight";
  if (findElementDeep(anchor, "wrapThrough")) return "through";
  if (findElementDeep(anchor, "wrapTopAndBottom")) return "topAndBottom";
  if (findElementDeep(anchor, "wrapNone")) return "none";
  return undefined;
}

function parseFloatingLayout(
  anchor: XmlElement,
): EditorImageFloatingLayout | undefined {
  const positionH = parseAnchorPosition(anchor, "positionH");
  const positionV = parseAnchorPosition(anchor, "positionV");
  const wrap = parseAnchorWrap(anchor);
  const distT = parseOptionalInt(anchor.getAttribute("distT"));
  const distB = parseOptionalInt(anchor.getAttribute("distB"));
  const distL = parseOptionalInt(anchor.getAttribute("distL"));
  const distR = parseOptionalInt(anchor.getAttribute("distR"));
  const simplePos = parseAnchorBoolean(anchor.getAttribute("simplePos"));
  const relativeHeight = parseOptionalInt(
    anchor.getAttribute("relativeHeight"),
  );
  const behindDoc = parseAnchorBoolean(anchor.getAttribute("behindDoc"));
  const locked = parseAnchorBoolean(anchor.getAttribute("locked"));
  const layoutInCell = parseAnchorBoolean(anchor.getAttribute("layoutInCell"));
  const allowOverlap = parseAnchorBoolean(anchor.getAttribute("allowOverlap"));
  return {
    type: "floating",
    ...(distT !== undefined ? { distT } : {}),
    ...(distB !== undefined ? { distB } : {}),
    ...(distL !== undefined ? { distL } : {}),
    ...(distR !== undefined ? { distR } : {}),
    ...(simplePos !== undefined ? { simplePos } : {}),
    ...(relativeHeight !== undefined ? { relativeHeight } : {}),
    ...(behindDoc !== undefined ? { behindDoc } : {}),
    ...(locked !== undefined ? { locked } : {}),
    ...(layoutInCell !== undefined ? { layoutInCell } : {}),
    ...(allowOverlap !== undefined ? { allowOverlap } : {}),
    ...(positionH ? { positionH } : {}),
    ...(positionV ? { positionV } : {}),
    ...(wrap ? { wrap } : {}),
  };
}

function parseCssLengthToPx(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(pt|px|in|cm|mm|pc)?$/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const unit = (match[2] ?? "px").toLowerCase();
  switch (unit) {
    case "pt":
      return Math.round(amount * PX_PER_POINT);
    case "in":
      return Math.round(amount * PX_PER_INCH);
    case "cm":
      return Math.round((amount / 2.54) * PX_PER_INCH);
    case "mm":
      return Math.round((amount / 25.4) * PX_PER_INCH);
    case "pc":
      return Math.round(amount * 12 * PX_PER_POINT);
    case "px":
    default:
      return Math.round(amount);
  }
}

function parseVmlStyleDimensions(style: string | null | undefined): {
  width?: number;
  height?: number;
} {
  const result: { width?: number; height?: number } = {};
  if (!style) {
    return result;
  }
  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) {
      continue;
    }
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (property === "width") {
      const width = parseCssLengthToPx(value);
      if (width !== null) {
        result.width = width;
      }
    } else if (property === "height") {
      const height = parseCssLengthToPx(value);
      if (height !== null) {
        result.height = height;
      }
    }
  }
  return result;
}

function parseVmlCropValue(
  value: string | null | undefined,
): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.endsWith("%")) {
    const percent = Number(trimmed.slice(0, -1));
    return Number.isFinite(percent) && percent !== 0
      ? percent / 100
      : undefined;
  }
  if (/f$/i.test(trimmed)) {
    const fraction = Number(trimmed.slice(0, -1));
    return Number.isFinite(fraction) && fraction !== 0
      ? fraction / VML_FRACTION_DENOMINATOR
      : undefined;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric !== 0
    ? numeric / VML_FRACTION_DENOMINATOR
    : undefined;
}

function parseVmlCrop(imageData: XmlElement): EditorImageRunData["crop"] {
  const crop = {
    left: parseVmlCropValue(getAttributeValue(imageData, "cropleft")),
    top: parseVmlCropValue(getAttributeValue(imageData, "croptop")),
    right: parseVmlCropValue(getAttributeValue(imageData, "cropright")),
    bottom: parseVmlCropValue(getAttributeValue(imageData, "cropbottom")),
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

async function loadEmbeddedImage(
  zip: JSZip,
  assets: AssetRegistry,
  target: string,
): Promise<string | undefined> {
  let zipPath = target;
  if (zipPath.startsWith("/")) zipPath = zipPath.slice(1);
  if (!zipPath.startsWith("word/")) zipPath = "word/" + target;
  const file = zip.file(zipPath);
  // Unknown extensions fall back to PNG so the data URL stays loadable;
  // preserving the original binary still round-trips through asset storage.
  const mime = imageMimeFromPath(target) ?? "image/png";
  const base64 = await file?.async("base64");
  if (!base64) {
    return undefined;
  }
  return registerImageAsset(assets, zipPath, `data:${mime};base64,${base64}`);
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
          const { embed, link } = parseBlipRels(blip);
          const container = findDrawingContainer(element);
          const drawingBox = container?.element ?? element;
          // Shared geometry/metadata, parsed once for both embedded and linked.
          const extent = findElementDeep(drawingBox, "extent");
          const docPr = findElementDeep(drawingBox, "docPr");
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
          const floating =
            container?.kind === "anchor"
              ? parseFloatingLayout(container.element)
              : undefined;
          const common = {
            width,
            height,
            ...(alt !== null ? { alt } : {}),
            ...(crop ? { crop } : {}),
            ...(fillMode ? { fillMode } : {}),
            ...(xfrm.rotation !== undefined ? { rotation: xfrm.rotation } : {}),
            ...(xfrm.flipH ? { flipH: true } : {}),
            ...(xfrm.flipV ? { flipV: true } : {}),
            ...(floating ? { floating } : {}),
          };

          const embedTarget = embed ? relsMap.get(embed) : undefined;
          const linkTarget = link ? relsMap.get(link) : undefined;

          if (linkTarget && isAbsoluteUri(linkTarget)) {
            // External linked image: preserve the URL, never auto-fetch it.
            textParts.push("\uFFFC");
            image = { src: "", linkedSrc: linkTarget, ...common };
          } else {
            // Embedded image (or rare internal r:link pointing inside the
            // package): read the binary and register it as an asset.
            const target = embedTarget ?? linkTarget;
            if (target) {
              const assetSrc = await loadEmbeddedImage(zip, assets, target);
              if (assetSrc) {
                textParts.push("\uFFFC");
                image = { src: assetSrc, ...common };
              }
            }
          }
        }
      } else if (element.localName === "pict") {
        const imageData = findElementDeep(element, "imagedata");
        if (imageData) {
          const relId = parseRelationshipId(imageData);
          const target = relId ? relsMap.get(relId) : undefined;
          if (target) {
            const shape = findElementDeep(element, "shape");
            const dimensions = parseVmlStyleDimensions(
              shape?.getAttribute("style"),
            );
            const crop = parseVmlCrop(imageData);
            const alt =
              getAttributeValue(imageData, "title") ??
              imageData.getAttribute("o:title");
            const assetSrc = await loadEmbeddedImage(zip, assets, target);
            if (assetSrc) {
              textParts.push("\uFFFC");
              image = {
                src: assetSrc,
                width: dimensions.width ?? 300,
                height: dimensions.height ?? 300,
                ...(alt ? { alt } : {}),
                ...(crop ? { crop } : {}),
              };
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

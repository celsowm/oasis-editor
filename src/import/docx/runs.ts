import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorTextStyle } from "../../core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  findElementDeep,
} from "./xmlHelpers.js";
import { PAGE_BREAK_MARKER } from "./units.js";
import { type AssetRegistry, registerImageAsset } from "./assetRegistry.js";
import { type ThemeFontMap } from "./themeFonts.js";
import { parseRunStyle } from "./styles.js";
import type { NumberingMaps } from "./numbering.js";

export interface ImportedRun {
  text: string;
  image?: { src: string; width: number; height: number; alt?: string };
  styles?: EditorTextStyle;
  field?: { type: "PAGE" | "NUMPAGES" };
}

export async function parseRunElement(
  runElement: XmlElement,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
): Promise<{ text: string; image?: { src: string; width: number; height: number; alt?: string } }> {
  const textParts: string[] = [];
  let image: { src: string; width: number; height: number; alt?: string } | undefined;

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
      } else if (element.localName === "br") {
        textParts.push(getAttributeValue(element, "type") === "page" ? PAGE_BREAK_MARKER : "\n");
      } else if (element.localName === "lastRenderedPageBreak") {
        textParts.push(PAGE_BREAK_MARKER);
      } else if (element.localName === "cr") {
        textParts.push("\n");
      } else if (element.localName === "drawing") {
        const blip = findElementDeep(element, "blip");
        if (blip) {
          let embed = null;
          for (let i = 0; i < blip.attributes.length; i++) {
             const attr = blip.attributes[i];
             if (attr && (attr.localName === "embed" || attr.name === "r:embed" || attr.name === "embed")) {
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
              const ext = target.split('.').pop()?.toLowerCase();
              const mime = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'image/png';
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
                  if (cx) width = Math.round(parseInt(cx, 10) / 9525);
                  if (cy) height = Math.round(parseInt(cy, 10) / 9525);
                }
                const alt = docPr
                  ? getAttributeValue(docPr, "descr") ?? getAttributeValue(docPr, "title")
                  : null;
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

export function getRunFieldCharType(runElement: XmlElement): string | null {
  const fieldChar = getFirstChildByTagNameNS(runElement, WORD_NS, "fldChar");
  return fieldChar ? getAttributeValue(fieldChar, "fldCharType") : null;
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
  themeFonts: ThemeFontMap,
  inheritedLink?: string | null,
): Promise<ImportedRun[]> {
  const runs: ImportedRun[] = [];
  let activeField:
    | {
        instruction: string;
        resultRuns: ImportedRun[];
        collectingResult: boolean;
      }
    | null = null;

  const flushActiveField = () => {
    if (!activeField) {
      return;
    }
    const instruction = activeField.instruction;
    const fieldType =
      /\bNUMPAGES\b/i.test(instruction) ? "NUMPAGES" : /\bPAGE\b/i.test(instruction) ? "PAGE" : null;
    const displayText = activeField.resultRuns.map((run) => run.text).join("") || "1";
    const styles = activeField.resultRuns.find((run) => run.styles)?.styles;
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
      const fieldCharType = getRunFieldCharType(element);
      if (fieldCharType === "begin") {
        flushActiveField();
        activeField = {
          instruction: "",
          resultRuns: [],
          collectingResult: false,
        };
        continue;
      }

      if (activeField) {
        const instructionText = getRunInstructionText(element);
        if (instructionText) {
          activeField.instruction += instructionText;
          continue;
        }

        if (fieldCharType === "separate") {
          activeField.collectingResult = true;
          continue;
        }

        if (fieldCharType === "end") {
          flushActiveField();
          continue;
        }
      }

      const { text, image } = await parseRunElement(element, zip, relsMap, assets);
      if (text.length === 0) {
        continue;
      }

      let styles = parseRunStyle(getFirstChildByTagNameNS(element, WORD_NS, "rPr"), themeFonts);
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
      const fieldType =
        /\bNUMPAGES\b/i.test(instr) ? "NUMPAGES" : /\bPAGE\b/i.test(instr) ? "PAGE" : null;
      const fieldRuns = await parseRunsContainer(
        element,
        numberingMaps,
        zip,
        relsMap,
        assets,
        themeFonts,
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
            element.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ??
            "",
        ) ?? null;

      href ??= element.getAttribute("w:anchor");
      runs.push(
        ...(await parseRunsContainer(
          element,
          numberingMaps,
          zip,
          relsMap,
          assets,
          themeFonts,
          href,
        )),
      );
    }
  }

  flushActiveField();

  return runs;
}

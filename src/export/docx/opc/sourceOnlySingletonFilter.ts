import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export interface RebuiltSingletonPresence {
  settings: boolean;
  styles: boolean;
  fontTable: boolean;
}

function elementChildren(node: XmlNode): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      result.push(child as XmlElement);
    }
  }
  return result;
}

function elementLocalName(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function parseRoot(
  xml: string,
  expectedLocalName: string,
): XmlElement | undefined {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const root = document.documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS &&
    elementLocalName(root) === expectedLocalName
    ? root
    : undefined;
}

function serializeIfHasChildren(root: XmlElement): string | undefined {
  return elementChildren(root).length > 0
    ? new XMLSerializer().serializeToString(root.ownerDocument!)
    : undefined;
}

const MODELED_SETTINGS_ROOT_NAMES = new Set([
  "defaultTabStop",
  "autoHyphenation",
  "consecutiveHyphenLimit",
  "hyphenationZone",
  "doNotHyphenateCaps",
  "evenAndOddHeaders",
]);

const PARTIAL_SETTINGS_CONTAINERS = new Map<string, ReadonlySet<string>>([
  ["compat", new Set(["allowSpaceOfSameStyleInTable"])],
  ["footnotePr", new Set(["numFmt", "numStart", "numRestart"])],
  ["endnotePr", new Set(["numFmt", "numStart", "numRestart"])],
]);

function filterSettingsXml(xml: string): string | undefined {
  const root = parseRoot(xml, "settings");
  if (!root) {
    return xml;
  }

  for (const child of [...elementChildren(root)]) {
    if (child.namespaceURI !== WORD_NS) {
      continue;
    }
    const localName = elementLocalName(child);
    if (MODELED_SETTINGS_ROOT_NAMES.has(localName)) {
      root.removeChild(child);
      continue;
    }

    const modeledChildren = PARTIAL_SETTINGS_CONTAINERS.get(localName);
    if (!modeledChildren) {
      continue;
    }
    for (const nested of [...elementChildren(child)]) {
      if (
        nested.namespaceURI === WORD_NS &&
        modeledChildren.has(elementLocalName(nested))
      ) {
        child.removeChild(nested);
      }
    }
    if (elementChildren(child).length === 0) {
      root.removeChild(child);
    }
  }

  return serializeIfHasChildren(root);
}

function filterStylesXml(xml: string): string | undefined {
  const root = parseRoot(xml, "styles");
  if (!root) {
    return xml;
  }

  // Individual w:style entries are represented by EditorNamedStyle and their
  // absence from a rebuild can be an explicit deletion. Preserve only root
  // content the editor does not model as named styles (docDefaults,
  // latentStyles, producer extensions, future namespaces, ...).
  for (const child of [...elementChildren(root)]) {
    if (child.namespaceURI === WORD_NS && elementLocalName(child) === "style") {
      root.removeChild(child);
    }
  }

  return serializeIfHasChildren(root);
}

function filterFontTableXml(xml: string): string | undefined {
  const root = parseRoot(xml, "fonts");
  if (!root) {
    return xml;
  }

  // w:font entries are modeled. If the rebuild omitted fontTable.xml, an empty
  // EditorFontInfo[] can represent an intentional deletion, so do not restore
  // those entries merely because their source XML carried unmodeled children.
  for (const child of [...elementChildren(root)]) {
    if (child.namespaceURI === WORD_NS && elementLocalName(child) === "font") {
      root.removeChild(child);
    }
  }

  return serializeIfHasChildren(root);
}

async function filterSourceOnlyPart(
  rebuilt: JSZip,
  path: string,
  filter: (xml: string) => string | undefined,
): Promise<boolean> {
  const entry = rebuilt.file(path);
  if (!entry) {
    return false;
  }
  const xml = await entry.async("string");
  const filtered = filter(xml);
  if (filtered === xml) {
    return false;
  }
  if (filtered === undefined) {
    rebuilt.remove(path);
  } else {
    rebuilt.file(path, filtered);
  }
  return true;
}

/**
 * When the ordinary exporter omitted a modeled singleton but the source-aware
 * prepatch restored it for preservation, strip modeled semantics before the
 * OPC merge. This prevents an explicit "delete the last setting/style/font"
 * edit from being undone while still retaining unsupported source markup.
 *
 * Numbering is intentionally not filtered here: unused numbering definitions
 * have no document-visible effect once all numPr references are gone, and
 * preserving them avoids needless loss until source ID stabilization lets us
 * merge active numbering graphs safely.
 */
export async function filterSourceOnlyWordSingletons(
  rebuilt: JSZip,
  originallyPresent: RebuiltSingletonPresence,
): Promise<boolean> {
  let changed = false;
  if (!originallyPresent.settings) {
    changed =
      (await filterSourceOnlyPart(
        rebuilt,
        "word/settings.xml",
        filterSettingsXml,
      )) || changed;
  }
  if (!originallyPresent.styles) {
    changed =
      (await filterSourceOnlyPart(
        rebuilt,
        "word/styles.xml",
        filterStylesXml,
      )) || changed;
  }
  if (!originallyPresent.fontTable) {
    changed =
      (await filterSourceOnlyPart(
        rebuilt,
        "word/fontTable.xml",
        filterFontTableXml,
      )) || changed;
  }
  return changed;
}

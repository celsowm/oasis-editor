import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type {
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
} from "@/core/model.js";
import { mergeNestedExtensionMarkup } from "./opc/extensionMarkupMerge.js";
import { OFFICE_REL_NS, WORD_NS } from "./xmlUtils.js";
import {
  createEditorTableCellPropertiesSignature,
  createEditorTableGridSignature,
  createEditorTablePropertiesSignature,
  createEditorTableRowPropertiesSignature,
  createEditorTableRowPropertyExceptionsSignature,
  getEditorTableCellOoxmlSource,
  getEditorTableOoxmlSource,
  getEditorTableRowOoxmlSource,
  ooxmlPropertiesSourceHasRelationships,
  type EditorOoxmlPropertiesSource,
} from "@/ooxml/word/sourceFragments.js";

const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

const MODELED_TABLE_PROPERTY_NAMES = new Set([
  "tblStyle",
  "tblpPr",
  "tblOverlap",
  "bidiVisual",
  "tblStyleRowBandSize",
  "tblStyleColBandSize",
  "tblW",
  "jc",
  "tblCellSpacing",
  "tblInd",
  "tblBorders",
  "tblLayout",
  "tblCellMar",
  "tblLook",
  "tblCaption",
  "tblDescription",
  "tblPrChange",
]);

const MODELED_TABLE_GRID_NAMES = new Set(["gridCol", "tblGridChange"]);

const MODELED_TABLE_PROPERTY_EXCEPTION_NAMES = new Set([
  "tblW",
  "jc",
  "tblCellSpacing",
  "tblInd",
  "tblBorders",
  "tblLayout",
  "tblCellMar",
  "tblPrExChange",
]);

const MODELED_TABLE_ROW_PROPERTY_NAMES = new Set([
  "cnfStyle",
  "gridBefore",
  "gridAfter",
  "wBefore",
  "wAfter",
  "cantSplit",
  "trHeight",
  "tblHeader",
  "tblCellSpacing",
  "jc",
  "hidden",
  "ins",
  "del",
  "trPrChange",
]);

const MODELED_TABLE_CELL_PROPERTY_NAMES = new Set([
  "cnfStyle",
  "tcW",
  "gridSpan",
  "hMerge",
  "vMerge",
  "tcBorders",
  "shd",
  "noWrap",
  "tcMar",
  "textDirection",
  "tcFitText",
  "vAlign",
  "hideMark",
  "headers",
  "cellIns",
  "cellDel",
  "cellMerge",
  "tcPrChange",
]);

function directElementChildren(element: XmlElement): XmlElement[] {
  const children: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      children.push(child as XmlElement);
    }
  }
  return children;
}

function elementLocalName(element: XmlElement): string {
  return element.localName ?? element.tagName;
}

function elementKey(element: XmlElement): string {
  return `${element.namespaceURI ?? ""}\u0000${elementLocalName(element)}`;
}

function parsePropertyElement(
  xml: string,
  expectedLocalName: string,
): XmlElement | undefined {
  const root = new DOMParser().parseFromString(xml, "application/xml")
    .documentElement as XmlElement | undefined;
  return root?.namespaceURI === WORD_NS &&
    elementLocalName(root) === expectedLocalName
    ? root
    : undefined;
}

function createGeneratedPropertyElement(
  generatedXml: string,
  expectedLocalName: string,
): XmlElement | undefined {
  if (generatedXml) {
    const generated = parsePropertyElement(generatedXml, expectedLocalName);
    if (generated) {
      return generated;
    }
  }
  return new DOMParser().parseFromString(
    `<w:${expectedLocalName} xmlns:w="${WORD_NS}"/>`,
    "application/xml",
  ).documentElement as XmlElement | undefined;
}

function copySourceAttributes(source: XmlElement, generated: XmlElement): void {
  for (let index = 0; index < source.attributes.length; index += 1) {
    const attribute = source.attributes.item(index);
    if (!attribute || attribute.namespaceURI === OFFICE_REL_NS) {
      continue;
    }
    const localName = attribute.localName ?? attribute.name;
    const present = attribute.namespaceURI
      ? generated.hasAttributeNS(attribute.namespaceURI, localName)
      : generated.hasAttribute(attribute.name);
    if (present) {
      continue;
    }
    if (attribute.namespaceURI) {
      generated.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      generated.setAttribute(attribute.name, attribute.value);
    }
  }
}

function hasMeaningfulAttributes(element: XmlElement): boolean {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute && attribute.namespaceURI !== XMLNS_NS) {
      return true;
    }
  }
  return false;
}

function mergePropertyElement(
  source: EditorOoxmlPropertiesSource | undefined,
  generatedXml: string,
  expectedLocalName: string,
  modeledNames: ReadonlySet<string>,
  currentSemanticSignature: string,
): string {
  if (!source || ooxmlPropertiesSourceHasRelationships(source)) {
    return generatedXml;
  }
  if (source.semanticSignature === currentSemanticSignature) {
    return source.xml;
  }

  const sourceElement = parsePropertyElement(source.xml, expectedLocalName);
  const generatedElement = createGeneratedPropertyElement(
    generatedXml,
    expectedLocalName,
  );
  if (!sourceElement || !generatedElement) {
    return generatedXml;
  }

  copySourceAttributes(sourceElement, generatedElement);
  const sourceChildren = directElementChildren(sourceElement);
  const generatedChildren = directElementChildren(generatedElement);
  const generatedByKey = new Map<string, XmlElement[]>();
  for (const child of generatedChildren) {
    const key = elementKey(child);
    const bucket = generatedByKey.get(key) ?? [];
    bucket.push(child);
    generatedByKey.set(key, bucket);
  }
  const sourceOccurrences = new Map<string, number>();
  for (const sourceChild of sourceChildren) {
    const key = elementKey(sourceChild);
    const occurrence = sourceOccurrences.get(key) ?? 0;
    sourceOccurrences.set(key, occurrence + 1);
    const generatedChild = generatedByKey.get(key)?.[occurrence];
    if (generatedChild) {
      mergeNestedExtensionMarkup(sourceChild, generatedChild);
    }
  }

  const generatedKeys = new Set(generatedChildren.map(elementKey));
  const preservedChildren = sourceChildren.filter(
    (child): boolean =>
      !(
        child.namespaceURI === WORD_NS &&
        modeledNames.has(elementLocalName(child))
      ) && !generatedKeys.has(elementKey(child)),
  );

  for (const child of preservedChildren) {
    const sourceIndex = sourceChildren.indexOf(child);
    const nextGeneratedSourceChild = sourceChildren
      .slice(sourceIndex + 1)
      .find((candidate): boolean => generatedKeys.has(elementKey(candidate)));
    const anchor = nextGeneratedSourceChild
      ? (directElementChildren(generatedElement).find(
          (candidate): boolean =>
            elementKey(candidate) === elementKey(nextGeneratedSourceChild),
        ) ?? null)
      : null;
    generatedElement.insertBefore(child.cloneNode(true), anchor);
  }

  if (
    !generatedXml &&
    !hasMeaningfulAttributes(generatedElement) &&
    directElementChildren(generatedElement).length === 0
  ) {
    return "";
  }
  return new XMLSerializer().serializeToString(generatedElement);
}

function mergeStandalonePropertyElement(
  sourceXml: string,
  generatedXml: string,
  expectedLocalName: string,
  modeledNames: ReadonlySet<string>,
): string {
  return mergePropertyElement(
    { xml: sourceXml, semanticSignature: "source" },
    generatedXml,
    expectedLocalName,
    modeledNames,
    "generated",
  );
}

/** Source-aware merge for a standalone `w:tblPr` such as a table style. */
export function mergeTablePropertiesXmlSource(
  sourceXml: string,
  generatedXml: string,
): string {
  return mergeStandalonePropertyElement(
    sourceXml,
    generatedXml,
    "tblPr",
    MODELED_TABLE_PROPERTY_NAMES,
  );
}

/** Source-aware merge for a standalone `w:trPr` such as `w:tblStylePr`. */
export function mergeTableRowPropertiesXmlSource(
  sourceXml: string,
  generatedXml: string,
): string {
  return mergeStandalonePropertyElement(
    sourceXml,
    generatedXml,
    "trPr",
    MODELED_TABLE_ROW_PROPERTY_NAMES,
  );
}

/** Source-aware merge for a standalone `w:tcPr` such as `w:tblStylePr`. */
export function mergeTableCellPropertiesXmlSource(
  sourceXml: string,
  generatedXml: string,
): string {
  return mergeStandalonePropertyElement(
    sourceXml,
    generatedXml,
    "tcPr",
    MODELED_TABLE_CELL_PROPERTY_NAMES,
  );
}

export function mergeTablePropertiesOoxmlSource(
  table: EditorTableNode,
  generatedXml: string,
): string {
  return mergePropertyElement(
    getEditorTableOoxmlSource(table)?.tableProperties,
    generatedXml,
    "tblPr",
    MODELED_TABLE_PROPERTY_NAMES,
    createEditorTablePropertiesSignature(table),
  );
}

export function mergeTableGridOoxmlSource(
  table: EditorTableNode,
  generatedXml: string,
): string {
  return mergePropertyElement(
    getEditorTableOoxmlSource(table)?.tableGrid,
    generatedXml,
    "tblGrid",
    MODELED_TABLE_GRID_NAMES,
    createEditorTableGridSignature(table),
  );
}

export function mergeTableRowPropertyExceptionsOoxmlSource(
  row: EditorTableRowNode,
  generatedXml: string,
): string {
  return mergePropertyElement(
    getEditorTableRowOoxmlSource(row)?.propertyExceptions,
    generatedXml,
    "tblPrEx",
    MODELED_TABLE_PROPERTY_EXCEPTION_NAMES,
    createEditorTableRowPropertyExceptionsSignature(row),
  );
}

export function mergeTableRowPropertiesOoxmlSource(
  row: EditorTableRowNode,
  generatedXml: string,
): string {
  return mergePropertyElement(
    getEditorTableRowOoxmlSource(row)?.rowProperties,
    generatedXml,
    "trPr",
    MODELED_TABLE_ROW_PROPERTY_NAMES,
    createEditorTableRowPropertiesSignature(row),
  );
}

export function mergeTableCellPropertiesOoxmlSource(
  cell: EditorTableCellNode,
  generatedXml: string,
): string {
  return mergePropertyElement(
    getEditorTableCellOoxmlSource(cell)?.cellProperties,
    generatedXml,
    "tcPr",
    MODELED_TABLE_CELL_PROPERTY_NAMES,
    createEditorTableCellPropertiesSignature(cell),
  );
}

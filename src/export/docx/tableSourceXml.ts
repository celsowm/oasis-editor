import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type { EditorTableNode } from "@/core/model.js";
import {
  serializeTableXml,
  type SerializeTableParagraphXml,
} from "./tableXml.js";
import { OFFICE_REL_NS, WORD_NS } from "./xmlUtils.js";
import {
  getEditorTableOoxmlSource,
} from "@/ooxml/word/sourceFragments.js";
import {
  mergeTableCellPropertiesOoxmlSource,
  mergeTableGridOoxmlSource,
  mergeTablePropertiesOoxmlSource,
  mergeTableRowPropertiesOoxmlSource,
  mergeTableRowPropertyExceptionsOoxmlSource,
} from "./tableSourcePropertiesXml.js";

function directElementChildren(parent: XmlElement): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const child = parent.childNodes[index];
    if (child?.nodeType === child.ELEMENT_NODE) {
      result.push(child as XmlElement);
    }
  }
  return result;
}

function directWordChildren(
  parent: XmlElement,
  localName: string,
): XmlElement[] {
  return directElementChildren(parent).filter(
    (child): boolean =>
      child.namespaceURI === WORD_NS && child.localName === localName,
  );
}

function firstDirectWordChild(
  parent: XmlElement,
  localName: string,
): XmlElement | undefined {
  return directWordChildren(parent, localName)[0];
}

function parseWordFragment(
  xml: string,
  expectedLocalName: string,
): XmlElement | undefined {
  const wrapper = new DOMParser().parseFromString(
    `<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${WORD_NS}">${xml}</oasis:root>`,
    "application/xml",
  ).documentElement as XmlElement | undefined;
  const element = wrapper
    ? directElementChildren(wrapper).find(
        (child): boolean =>
          child.namespaceURI === WORD_NS &&
          child.localName === expectedLocalName,
      )
    : undefined;
  return element;
}

function serializeElement(element: XmlElement | undefined): string {
  return element ? new XMLSerializer().serializeToString(element) : "";
}

function hasRelationshipReference(xml: string): boolean {
  return /\br:(?:id|embed|link)\s*=/.test(xml);
}

function copySourceAttributes(
  source: XmlElement,
  generated: XmlElement,
): void {
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

function tableAnchorKeys(children: XmlElement[]): Map<XmlElement, string> {
  const result = new Map<XmlElement, string>();
  let rowIndex = 0;
  for (const child of children) {
    if (child.namespaceURI !== WORD_NS) {
      continue;
    }
    if (child.localName === "tblPr" || child.localName === "tblGrid") {
      result.set(child, child.localName);
    } else if (child.localName === "tr") {
      result.set(child, `tr:${rowIndex}`);
      rowIndex += 1;
    }
  }
  return result;
}

function overlayTableContainerSource(
  table: EditorTableNode,
  generatedTable: XmlElement,
): void {
  const sourceXml = getEditorTableOoxmlSource(table)?.xml;
  if (!sourceXml) {
    return;
  }
  const sourceTable = parseWordFragment(sourceXml, "tbl");
  if (!sourceTable) {
    return;
  }
  copySourceAttributes(sourceTable, generatedTable);

  const sourceChildren = directElementChildren(sourceTable);
  const generatedChildren = directElementChildren(generatedTable);
  const sourceRows = sourceChildren.filter(
    (child): boolean =>
      child.namespaceURI === WORD_NS && child.localName === "tr",
  );
  const generatedRows = generatedChildren.filter(
    (child): boolean =>
      child.namespaceURI === WORD_NS && child.localName === "tr",
  );
  if (sourceRows.length !== generatedRows.length) {
    return;
  }

  const sourceAnchorKeys = tableAnchorKeys(sourceChildren);
  const generatedAnchorByKey = new Map(
    [...tableAnchorKeys(generatedChildren)].map(
      ([element, key]): readonly [string, XmlElement] => [key, element],
    ),
  );

  for (let index = 0; index < sourceChildren.length; index += 1) {
    const child = sourceChildren[index]!;
    if (sourceAnchorKeys.has(child)) {
      continue;
    }
    const childXml = serializeElement(child);
    if (hasRelationshipReference(childXml)) {
      continue;
    }
    const nextAnchorKey = sourceChildren
      .slice(index + 1)
      .map((candidate): string | undefined => sourceAnchorKeys.get(candidate))
      .find((key): key is string => Boolean(key));
    const anchor = nextAnchorKey
      ? generatedAnchorByKey.get(nextAnchorKey) ?? null
      : null;
    generatedTable.insertBefore(child.cloneNode(true), anchor);
  }
}

function insertPropertyElement(
  parent: XmlElement,
  current: XmlElement | undefined,
  mergedXml: string,
  localName: string,
  anchor: XmlElement | null,
): void {
  if (!mergedXml) {
    if (current) {
      parent.removeChild(current);
    }
    return;
  }
  const merged = parseWordFragment(mergedXml, localName);
  if (!merged) {
    return;
  }
  if (current) {
    parent.replaceChild(merged.cloneNode(true), current);
  } else {
    parent.insertBefore(merged.cloneNode(true), anchor);
  }
}

function overlayTableProperties(
  table: EditorTableNode,
  tableElement: XmlElement,
): void {
  const currentProperties = firstDirectWordChild(tableElement, "tblPr");
  const currentGrid = firstDirectWordChild(tableElement, "tblGrid");
  const firstRow = firstDirectWordChild(tableElement, "tr") ?? null;

  insertPropertyElement(
    tableElement,
    currentProperties,
    mergeTablePropertiesOoxmlSource(
      table,
      serializeElement(currentProperties),
    ),
    "tblPr",
    currentGrid ?? firstRow,
  );

  const refreshedGrid = firstDirectWordChild(tableElement, "tblGrid");
  insertPropertyElement(
    tableElement,
    refreshedGrid,
    mergeTableGridOoxmlSource(table, serializeElement(refreshedGrid)),
    "tblGrid",
    firstDirectWordChild(tableElement, "tr") ?? null,
  );
}

function overlayRowAndCellProperties(
  table: EditorTableNode,
  tableElement: XmlElement,
): void {
  const rowElements = directWordChildren(tableElement, "tr");
  if (rowElements.length !== table.rows.length) {
    return;
  }

  rowElements.forEach((rowElement, rowIndex): void => {
    const row = table.rows[rowIndex]!;
    const currentExceptions = firstDirectWordChild(rowElement, "tblPrEx");
    const currentProperties = firstDirectWordChild(rowElement, "trPr");
    const firstCell = firstDirectWordChild(rowElement, "tc") ?? null;

    insertPropertyElement(
      rowElement,
      currentExceptions,
      mergeTableRowPropertyExceptionsOoxmlSource(
        row,
        serializeElement(currentExceptions),
      ),
      "tblPrEx",
      currentProperties ?? firstCell,
    );

    const refreshedProperties = firstDirectWordChild(rowElement, "trPr");
    insertPropertyElement(
      rowElement,
      refreshedProperties,
      mergeTableRowPropertiesOoxmlSource(
        row,
        serializeElement(refreshedProperties),
      ),
      "trPr",
      firstDirectWordChild(rowElement, "tc") ?? null,
    );

    const cellElements = directWordChildren(rowElement, "tc");
    if (cellElements.length !== row.cells.length) {
      return;
    }
    cellElements.forEach((cellElement, cellIndex): void => {
      const cell = row.cells[cellIndex]!;
      const currentCellProperties = firstDirectWordChild(cellElement, "tcPr");
      insertPropertyElement(
        cellElement,
        currentCellProperties,
        mergeTableCellPropertiesOoxmlSource(
          cell,
          serializeElement(currentCellProperties),
        ),
        "tcPr",
        firstDirectWordChild(cellElement, "p") ??
          firstDirectWordChild(cellElement, "tbl") ??
          null,
      );
    });
  });
}

/**
 * Serializes a table canonically and then overlays source-backed table, row and
 * cell property containers. Text/content stays authoritative from the editor;
 * source attributes, extension children and unknown property children survive
 * while relationship-bearing fragments continue to use the conservative path.
 */
export function serializeTableXmlPreservingSource(
  table: EditorTableNode,
  serializeParagraphXml: SerializeTableParagraphXml,
): string {
  const canonicalXml = serializeTableXml(table, serializeParagraphXml);
  const tableElement = parseWordFragment(canonicalXml, "tbl");
  if (!tableElement) {
    return canonicalXml;
  }
  overlayTableContainerSource(table, tableElement);
  overlayTableProperties(table, tableElement);
  overlayRowAndCellProperties(table, tableElement);
  return new XMLSerializer().serializeToString(tableElement);
}

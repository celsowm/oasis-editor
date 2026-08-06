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
import { WORD_NS } from "./xmlUtils.js";
import {
  mergeTableCellPropertiesOoxmlSource,
  mergeTableGridOoxmlSource,
  mergeTablePropertiesOoxmlSource,
  mergeTableRowPropertiesOoxmlSource,
  mergeTableRowPropertyExceptionsOoxmlSource,
} from "./tableSourcePropertiesXml.js";

function directWordChildren(
  parent: XmlElement,
  localName: string,
): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const child = parent.childNodes[index];
    if (
      child?.nodeType === child.ELEMENT_NODE &&
      child.namespaceURI === WORD_NS &&
      child.localName === localName
    ) {
      result.push(child as XmlElement);
    }
  }
  return result;
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
    ? Array.from({ length: wrapper.childNodes.length }, (_, index) =>
        wrapper.childNodes[index],
      ).find(
        (child): boolean =>
          child?.nodeType === child.ELEMENT_NODE &&
          child.namespaceURI === WORD_NS &&
          child.localName === expectedLocalName,
      )
    : undefined;
  return element as XmlElement | undefined;
}

function serializeElement(element: XmlElement | undefined): string {
  return element ? new XMLSerializer().serializeToString(element) : "";
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
 * only source attributes and unknown children are retained by the mergers.
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
  overlayTableProperties(table, tableElement);
  overlayRowAndCellProperties(table, tableElement);
  return new XMLSerializer().serializeToString(tableElement);
}

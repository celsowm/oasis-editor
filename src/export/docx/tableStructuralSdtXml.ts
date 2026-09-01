import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorSdtBlockWrapper,
  EditorTableNode,
} from "@/core/model.js";
import { WORD_NS } from "./xmlUtils.js";
import { serializeSdtPrXml } from "./text/sdtXml.js";

interface WrappedElement {
  element: XmlElement;
  wrappers: EditorSdtBlockWrapper[];
}

function directWordChildren(
  parent: XmlElement,
  localName: string,
): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const node = parent.childNodes[index];
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as XmlElement).namespaceURI === WORD_NS &&
      (node as XmlElement).localName === localName
    ) {
      result.push(node as XmlElement);
    }
  }
  return result;
}

function parseWordFragment(
  xml: string,
  expectedLocalName: string,
): XmlElement | undefined {
  const wrapper = new DOMParser().parseFromString(
    `<oasis:root xmlns:oasis="urn:oasis:docx" xmlns:w="${WORD_NS}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">${xml}</oasis:root>`,
    "application/xml",
  ).documentElement as XmlElement | undefined;
  if (!wrapper) return undefined;
  for (let index = 0; index < wrapper.childNodes.length; index += 1) {
    const node = wrapper.childNodes[index];
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as XmlElement).namespaceURI === WORD_NS &&
      (node as XmlElement).localName === expectedLocalName
    ) {
      return node as XmlElement;
    }
  }
  return undefined;
}

function createSdtEnvelope(
  parent: XmlElement,
  wrapper: EditorSdtBlockWrapper,
): { sdt: XmlElement; content: XmlElement } | null {
  const document = parent.ownerDocument;
  if (!document) return null;
  const sdt = document.createElementNS(WORD_NS, "w:sdt");
  const properties = parseWordFragment(serializeSdtPrXml(wrapper.sdtPr), "sdtPr");
  if (properties) {
    sdt.appendChild(properties.cloneNode(true));
  }
  if (wrapper.sdtEndPrXml) {
    const endProperties = parseWordFragment(wrapper.sdtEndPrXml, "sdtEndPr");
    if (endProperties) {
      sdt.appendChild(endProperties.cloneNode(true));
    }
  }
  const content = document.createElementNS(WORD_NS, "w:sdtContent");
  sdt.appendChild(content);
  return { sdt, content };
}

function wrapSequence(parent: XmlElement, entries: WrappedElement[]): void {
  let index = 0;
  while (index < entries.length) {
    const wrapper = entries[index]!.wrappers[0];
    if (!wrapper) {
      index += 1;
      continue;
    }

    let end = index + 1;
    while (
      end < entries.length &&
      entries[end]!.wrappers[0]?.groupId === wrapper.groupId
    ) {
      end += 1;
    }

    const envelope = createSdtEnvelope(parent, wrapper);
    if (!envelope) {
      index = end;
      continue;
    }
    parent.insertBefore(envelope.sdt, entries[index]!.element);

    const nestedEntries: WrappedElement[] = [];
    for (let cursor = index; cursor < end; cursor += 1) {
      const entry = entries[cursor]!;
      envelope.content.appendChild(entry.element);
      nestedEntries.push({
        element: entry.element,
        wrappers: entry.wrappers.slice(1),
      });
    }
    wrapSequence(envelope.content, nestedEntries);
    index = end;
  }
}

/**
 * Rebuilds row-level and cell-level `w:sdt` envelopes after canonical table
 * serialization and source-property overlay have completed. Structural wrappers
 * therefore do not interfere with the existing row/cell property pipeline.
 */
export function wrapTableStructuralSdts(
  table: EditorTableNode,
  tableElement: XmlElement,
): void {
  const rowElements = directWordChildren(tableElement, "tr");
  if (rowElements.length !== table.rows.length) return;

  for (let rowIndex = 0; rowIndex < rowElements.length; rowIndex += 1) {
    const rowElement = rowElements[rowIndex]!;
    const row = table.rows[rowIndex]!;
    const cellElements = directWordChildren(rowElement, "tc");
    if (cellElements.length !== row.cells.length) continue;
    wrapSequence(
      rowElement,
      cellElements.map((element, cellIndex): WrappedElement => ({
        element,
        wrappers: row.cells[cellIndex]!.sdtWrappers ?? [],
      })),
    );
  }

  wrapSequence(
    tableElement,
    rowElements.map((element, rowIndex): WrappedElement => ({
      element,
      wrappers: table.rows[rowIndex]!.sdtWrappers ?? [],
    })),
  );
}

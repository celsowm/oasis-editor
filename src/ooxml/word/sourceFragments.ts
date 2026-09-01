import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type {
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
  EditorTextRun,
} from "@/core/model.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export interface EditorOoxmlRunSource {
  xml: string;
  semanticSignature: string;
  structureSignature: string;
}

export interface EditorOoxmlPropertiesSource {
  xml: string;
  semanticSignature: string;
}

export interface EditorOoxmlParagraphSource {
  xml?: string;
  semanticSignature?: string;
  attributes?: string;
  paragraphProperties?: EditorOoxmlPropertiesSource;
}

export interface EditorOoxmlTableSource {
  xml: string;
  semanticSignature: string;
  tableProperties?: EditorOoxmlPropertiesSource;
  tableGrid?: EditorOoxmlPropertiesSource;
}

export interface EditorOoxmlTableRowSource {
  rowProperties?: EditorOoxmlPropertiesSource;
  propertyExceptions?: EditorOoxmlPropertiesSource;
}

export interface EditorOoxmlTableCellSource {
  cellProperties?: EditorOoxmlPropertiesSource;
}

type EditorRunWithOoxmlSource = EditorTextRun & {
  ooxmlSource?: EditorOoxmlRunSource;
};

type EditorParagraphWithOoxmlSource = EditorParagraphNode & {
  ooxmlSource?: EditorOoxmlParagraphSource;
};

type EditorTableWithOoxmlSource = EditorTableNode & {
  ooxmlSource?: EditorOoxmlTableSource;
};

type EditorTableRowWithOoxmlSource = EditorTableRowNode & {
  ooxmlSource?: EditorOoxmlTableRowSource;
};

type EditorTableCellWithOoxmlSource = EditorTableCellNode & {
  ooxmlSource?: EditorOoxmlTableCellSource;
};

const RUN_PROPERTIES_PATTERN = /<w:rPr(?:\s|\/|>)/;
const PARAGRAPH_PROPERTIES_PATTERN = /<w:pPr(?:\s|\/|>)/;

function ownsEditorNodeIdentity(value: Record<string, unknown>): boolean {
  return (
    typeof value.kind === "string" ||
    typeof value.type === "string" ||
    Array.isArray(value.runs) ||
    Array.isArray(value.rows) ||
    Array.isArray(value.cells) ||
    Array.isArray(value.blocks)
  );
}

function normalizeSemanticValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeSemanticValue);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const omitNodeId = ownsEditorNodeIdentity(record);
  const normalized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (
      child === undefined ||
      (key === "id" && omitNodeId) ||
      key === "ooxmlSource" ||
      key.startsWith("__")
    ) {
      continue;
    }
    normalized[key] = normalizeSemanticValue(child);
  }
  return normalized;
}

function stableSemanticString(value: unknown): string {
  return JSON.stringify(normalizeSemanticValue(value)) ?? "undefined";
}

function hasRelationshipReference(xml: string): boolean {
  return /\br:(?:id|embed|link)\s*=/.test(xml);
}

function directWordChildren(
  element: XmlElement,
  localName: string,
): XmlElement[] {
  const children: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes[index];
    if (
      child?.nodeType === child.ELEMENT_NODE &&
      child.namespaceURI === WORD_NS &&
      child.localName === localName
    ) {
      children.push(child as XmlElement);
    }
  }
  return children;
}

function firstDirectWordChild(
  element: XmlElement,
  localName: string,
): XmlElement | undefined {
  return directWordChildren(element, localName)[0];
}

function serializeElement(element: XmlElement | undefined): string | undefined {
  return element ? new XMLSerializer().serializeToString(element) : undefined;
}

/**
 * Imported run properties are parsed into the editor model and must be emitted
 * by the canonical serializer. This restores derived complex-script twins,
 * resolved theme colors and compatibility wrappers while source-only children
 * are retained by the structural merge layer.
 */
export function ooxmlSourceNeedsCanonicalRunSerialization(
  xml: string,
): boolean {
  return RUN_PROPERTIES_PATTERN.test(xml);
}

export function createEditorRunSemanticSignature(run: EditorTextRun): string {
  return stableSemanticString(run);
}

export function createEditorRunStructureSignature(run: EditorTextRun): string {
  const semanticRun = { ...run, text: undefined };
  return stableSemanticString(semanticRun);
}

export function setEditorRunOoxmlSource(run: EditorTextRun, xml: string): void {
  (run as EditorRunWithOoxmlSource).ooxmlSource = {
    xml,
    semanticSignature: createEditorRunSemanticSignature(run),
    structureSignature: createEditorRunStructureSignature(run),
  };
}

export function getEditorRunOoxmlSource(
  run: EditorTextRun,
): EditorOoxmlRunSource | undefined {
  return (run as EditorRunWithOoxmlSource).ooxmlSource;
}

export function copyEditorRunOoxmlSource<T extends EditorTextRun>(
  source: EditorTextRun,
  target: T,
): T {
  const sourceFragment = getEditorRunOoxmlSource(source);
  if (sourceFragment) {
    (target as EditorRunWithOoxmlSource).ooxmlSource = {
      ...sourceFragment,
    };
  }
  return target;
}

export function createEditorParagraphSemanticSignature(
  paragraph: EditorParagraphNode,
): string {
  return stableSemanticString(paragraph);
}

export function createEditorParagraphPropertiesSignature(
  paragraph: EditorParagraphNode,
): string {
  return stableSemanticString({
    style: paragraph.style,
    list: paragraph.list,
    numberingRevision: paragraph.numberingRevision,
  });
}

export function setEditorParagraphOoxmlSource(
  paragraph: EditorParagraphNode,
  source: {
    xml?: string;
    attributes?: string;
    paragraphPropertiesXml?: string;
  },
): void {
  const paragraphSource: EditorOoxmlParagraphSource = {};
  if (source.xml) {
    paragraphSource.xml = source.xml;
    paragraphSource.semanticSignature =
      createEditorParagraphSemanticSignature(paragraph);
  }
  if (source.attributes) {
    paragraphSource.attributes = source.attributes;
  }
  if (source.paragraphPropertiesXml) {
    paragraphSource.paragraphProperties = {
      xml: source.paragraphPropertiesXml,
      semanticSignature: createEditorParagraphPropertiesSignature(paragraph),
    };
  }
  if (
    paragraphSource.xml ||
    paragraphSource.attributes ||
    paragraphSource.paragraphProperties
  ) {
    (paragraph as EditorParagraphWithOoxmlSource).ooxmlSource = paragraphSource;
  }
}

export function getEditorParagraphOoxmlSource(
  paragraph: EditorParagraphNode,
): EditorOoxmlParagraphSource | undefined {
  return (paragraph as EditorParagraphWithOoxmlSource).ooxmlSource;
}

export function getReusableEditorParagraphXml(
  paragraph: EditorParagraphNode,
  options: {
    hasOverrides: boolean;
    hasBoundaryTokens: boolean;
  },
): string | undefined {
  const source = getEditorParagraphOoxmlSource(paragraph);
  if (
    !source?.xml ||
    !source.semanticSignature ||
    options.hasOverrides ||
    options.hasBoundaryTokens ||
    hasRelationshipReference(source.xml) ||
    RUN_PROPERTIES_PATTERN.test(source.xml) ||
    PARAGRAPH_PROPERTIES_PATTERN.test(source.xml)
  ) {
    return undefined;
  }
  return source.semanticSignature ===
    createEditorParagraphSemanticSignature(paragraph)
    ? source.xml
    : undefined;
}

export function getEditorParagraphOoxmlAttributes(
  paragraph: EditorParagraphNode,
): string | undefined {
  return getEditorParagraphOoxmlSource(paragraph)?.attributes;
}

export function getReusableEditorParagraphPropertiesXml(
  paragraph: EditorParagraphNode,
  hasOverrides: boolean,
): string | undefined {
  const source = getEditorParagraphOoxmlSource(paragraph)?.paragraphProperties;
  if (
    !source ||
    hasOverrides ||
    paragraph.list ||
    hasRelationshipReference(source.xml)
  ) {
    return undefined;
  }
  return source.semanticSignature ===
    createEditorParagraphPropertiesSignature(paragraph)
    ? source.xml
    : undefined;
}

export function createEditorTableSemanticSignature(
  table: EditorTableNode,
): string {
  return stableSemanticString(table);
}

export function createEditorTablePropertiesSignature(
  table: EditorTableNode,
): string {
  return stableSemanticString({ style: table.style });
}

export function createEditorTableGridSignature(table: EditorTableNode): string {
  return stableSemanticString({
    gridCols: table.gridCols,
    gridRevision: table.gridRevision,
  });
}

export function createEditorTableRowPropertiesSignature(
  row: EditorTableRowNode,
): string {
  return stableSemanticString({
    isHeader: row.isHeader,
    style: row.style,
    conditionalStyle: row.conditionalStyle,
  });
}

export function createEditorTableRowPropertyExceptionsSignature(
  row: EditorTableRowNode,
): string {
  return stableSemanticString({
    propertyExceptions: row.propertyExceptions,
    tblPrExChangeXml: row.tblPrExChangeXml,
  });
}

export function createEditorTableCellPropertiesSignature(
  cell: EditorTableCellNode,
): string {
  return stableSemanticString({
    colSpan: cell.colSpan,
    rowSpan: cell.rowSpan,
    vMerge: cell.vMerge,
    style: cell.style,
    conditionalStyle: cell.conditionalStyle,
    mergeRevisionState: cell.mergeRevisionState,
  });
}

export function setEditorTableRowOoxmlSource(
  row: EditorTableRowNode,
  source: {
    rowPropertiesXml?: string;
    propertyExceptionsXml?: string;
  },
): void {
  const rowSource: EditorOoxmlTableRowSource = {};
  if (source.rowPropertiesXml) {
    rowSource.rowProperties = {
      xml: source.rowPropertiesXml,
      semanticSignature: createEditorTableRowPropertiesSignature(row),
    };
  }
  if (source.propertyExceptionsXml) {
    rowSource.propertyExceptions = {
      xml: source.propertyExceptionsXml,
      semanticSignature: createEditorTableRowPropertyExceptionsSignature(row),
    };
  }
  if (rowSource.rowProperties || rowSource.propertyExceptions) {
    (row as EditorTableRowWithOoxmlSource).ooxmlSource = rowSource;
  }
}

export function getEditorTableRowOoxmlSource(
  row: EditorTableRowNode,
): EditorOoxmlTableRowSource | undefined {
  return (row as EditorTableRowWithOoxmlSource).ooxmlSource;
}

export function setEditorTableCellOoxmlSource(
  cell: EditorTableCellNode,
  cellPropertiesXml: string,
): void {
  (cell as EditorTableCellWithOoxmlSource).ooxmlSource = {
    cellProperties: {
      xml: cellPropertiesXml,
      semanticSignature: createEditorTableCellPropertiesSignature(cell),
    },
  };
}

export function getEditorTableCellOoxmlSource(
  cell: EditorTableCellNode,
): EditorOoxmlTableCellSource | undefined {
  return (cell as EditorTableCellWithOoxmlSource).ooxmlSource;
}

function captureGranularTableSources(
  table: EditorTableNode,
  tableElement: XmlElement,
): {
  tablePropertiesXml?: string;
  tableGridXml?: string;
} {
  const tablePropertiesXml = serializeElement(
    firstDirectWordChild(tableElement, "tblPr"),
  );
  const tableGridXml = serializeElement(
    firstDirectWordChild(tableElement, "tblGrid"),
  );
  const rowElements = directWordChildren(tableElement, "tr");

  if (rowElements.length === table.rows.length) {
    rowElements.forEach((rowElement, rowIndex): void => {
      const row = table.rows[rowIndex]!;
      setEditorTableRowOoxmlSource(row, {
        rowPropertiesXml: serializeElement(
          firstDirectWordChild(rowElement, "trPr"),
        ),
        propertyExceptionsXml: serializeElement(
          firstDirectWordChild(rowElement, "tblPrEx"),
        ),
      });

      const cellElements = directWordChildren(rowElement, "tc");
      // Legacy hMerge continuation cells are collapsed into their anchor on
      // import, so index-based tcPr binding is unsafe when counts differ.
      if (cellElements.length !== row.cells.length) {
        return;
      }
      cellElements.forEach((cellElement, cellIndex): void => {
        const cellPropertiesXml = serializeElement(
          firstDirectWordChild(cellElement, "tcPr"),
        );
        if (cellPropertiesXml) {
          setEditorTableCellOoxmlSource(
            row.cells[cellIndex]!,
            cellPropertiesXml,
          );
        }
      });
    });
  }

  return { tablePropertiesXml, tableGridXml };
}

export function setEditorTableOoxmlSource(
  table: EditorTableNode,
  source:
    | string
    | {
        xml: string;
        tablePropertiesXml?: string;
        tableGridXml?: string;
      },
): void {
  let normalized = typeof source === "string" ? { xml: source } : source;
  if (typeof source === "string") {
    const tableElement = new DOMParser().parseFromString(
      source,
      "application/xml",
    ).documentElement as XmlElement | undefined;
    if (
      tableElement?.namespaceURI === WORD_NS &&
      tableElement.localName === "tbl"
    ) {
      normalized = {
        ...normalized,
        ...captureGranularTableSources(table, tableElement),
      };
    }
  }

  const tableSource: EditorOoxmlTableSource = {
    xml: normalized.xml,
    semanticSignature: createEditorTableSemanticSignature(table),
  };
  if (normalized.tablePropertiesXml) {
    tableSource.tableProperties = {
      xml: normalized.tablePropertiesXml,
      semanticSignature: createEditorTablePropertiesSignature(table),
    };
  }
  if (normalized.tableGridXml) {
    tableSource.tableGrid = {
      xml: normalized.tableGridXml,
      semanticSignature: createEditorTableGridSignature(table),
    };
  }
  (table as EditorTableWithOoxmlSource).ooxmlSource = tableSource;
}

export function getEditorTableOoxmlSource(
  table: EditorTableNode,
): EditorOoxmlTableSource | undefined {
  return (table as EditorTableWithOoxmlSource).ooxmlSource;
}

export function getReusableEditorTableXml(
  table: EditorTableNode,
  options: { hasBoundaryTokens: boolean },
): string | undefined {
  const source = getEditorTableOoxmlSource(table);
  if (
    !source ||
    options.hasBoundaryTokens ||
    hasRelationshipReference(source.xml)
  ) {
    return undefined;
  }
  return source.semanticSignature === createEditorTableSemanticSignature(table)
    ? source.xml
    : undefined;
}

export function ooxmlPropertiesSourceHasRelationships(
  source: EditorOoxmlPropertiesSource | undefined,
): boolean {
  return Boolean(source && hasRelationshipReference(source.xml));
}

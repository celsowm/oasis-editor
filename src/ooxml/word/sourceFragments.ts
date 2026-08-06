import type { EditorParagraphNode, EditorTextRun } from "@/core/model.js";

export interface EditorOoxmlRunSource {
  xml: string;
  semanticSignature: string;
  structureSignature: string;
}

export interface EditorOoxmlParagraphPropertiesSource {
  xml: string;
  semanticSignature: string;
}

export interface EditorOoxmlParagraphSource {
  xml?: string;
  semanticSignature?: string;
  attributes?: string;
  paragraphProperties?: EditorOoxmlParagraphPropertiesSource;
}

type EditorRunWithOoxmlSource = EditorTextRun & {
  ooxmlSource?: EditorOoxmlRunSource;
};

type EditorParagraphWithOoxmlSource = EditorParagraphNode & {
  ooxmlSource?: EditorOoxmlParagraphSource;
};

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

export function createEditorRunSemanticSignature(
  run: EditorTextRun,
): string {
  return stableSemanticString(run);
}

export function createEditorRunStructureSignature(
  run: EditorTextRun,
): string {
  const semanticRun = { ...run, text: undefined };
  return stableSemanticString(semanticRun);
}

export function setEditorRunOoxmlSource(
  run: EditorTextRun,
  xml: string,
): void {
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
    hasRelationshipReference(source.xml)
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

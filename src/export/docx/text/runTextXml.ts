import { escapeXml } from "@/export/docx/xmlUtils.js";

function needsPreserveSpace(text: string): boolean {
  return /^\s|\s$/.test(text) || text.includes("  ");
}

function serializeTextSegment(segment: string): string {
  if (segment.length === 0) {
    return "";
  }
  const preserve = needsPreserveSpace(segment) ? ' xml:space="preserve"' : "";
  return `<w:t${preserve}>${escapeXml(segment)}</w:t>`;
}

export function serializeRunText(text: string): string {
  if (text.length === 0) {
    return "<w:t></w:t>";
  }

  let result = "";
  let buffer = "";
  for (const char of text) {
    if (char === "\n") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:br/>";
      continue;
    }
    if (char === "\t") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:tab/>";
      continue;
    }
    if (char === "\u2011") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:noBreakHyphen/>";
      continue;
    }
    if (char === "\u00AD") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:softHyphen/>";
      continue;
    }
    buffer += char;
  }

  result += serializeTextSegment(buffer);
  return result || "<w:t></w:t>";
}

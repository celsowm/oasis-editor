/**
 * Parses the comment *bodies* from `word/comments.xml` (and the resolved/"done"
 * flags from `word/commentsExtended.xml`) into a `docxId -> body` map. This is
 * the comment counterpart of `footnotes.ts`; the import driver joins these
 * bodies with the ranges resolved by `comments.ts`.
 *
 * Comment bodies in scope are single short paragraphs, so the body is flattened
 * to plain text (the shape the hover/click popup renders).
 */
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";

const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";

export interface ParsedCommentBody {
  author: string;
  initials?: string;
  date?: number;
  text: string;
  resolved?: boolean;
  /** `w14:paraId` of the comment's (first) paragraph — links to commentsEx. */
  paraId?: string;
}

/** Recursively collect text from `w:t` / `w:tab` / `w:br` descendants. */
function flattenCommentText(element: XmlElement): string {
  let out = "";
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (node?.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const child = node as XmlElement;
    if (child.namespaceURI === WORD_NS) {
      if (child.localName === "t") {
        out += child.textContent ?? "";
        continue;
      }
      if (child.localName === "tab") {
        out += "\t";
        continue;
      }
      if (child.localName === "br" || child.localName === "cr") {
        out += "\n";
        continue;
      }
    }
    out += flattenCommentText(child);
  }
  return out;
}

/** Parse `w:date` (ISO 8601) into an epoch ms timestamp, or undefined. */
function parseDate(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Parse `word/commentsExtended.xml` into a `w15:paraId -> done` map so the
 * resolved state can be folded onto the matching comment body.
 */
function parseCommentsExtended(xml: string | null): Map<string, boolean> {
  const done = new Map<string, boolean>();
  if (!xml) {
    return done;
  }
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return done;
  }
  for (const ex of getChildrenByTagNameNS(root, WORD15_NS, "commentEx")) {
    const paraId = ex.getAttributeNS(WORD15_NS, "paraId");
    if (!paraId) {
      continue;
    }
    const isDone = ex.getAttributeNS(WORD15_NS, "done");
    done.set(paraId, isDone === "1" || isDone === "true");
  }
  return done;
}

/**
 * Parse `word/comments.xml` (+ optional `word/commentsExtended.xml`) into a map
 * keyed by the DOCX `w:id` (string) of each comment.
 */
export function parseCommentsXml(
  commentsXml: string | null,
  commentsExtendedXml: string | null,
): Map<string, ParsedCommentBody> {
  const byDocxId = new Map<string, ParsedCommentBody>();
  if (!commentsXml) {
    return byDocxId;
  }
  const doc = new DOMParser().parseFromString(commentsXml, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    return byDocxId;
  }

  const doneByParaId = parseCommentsExtended(commentsExtendedXml);

  for (const comment of getChildrenByTagNameNS(root, WORD_NS, "comment")) {
    const docxId = getAttributeValue(comment, "id");
    if (docxId === null) {
      continue;
    }
    const author = getAttributeValue(comment, "author") ?? "";
    const initials = getAttributeValue(comment, "initials") ?? undefined;
    const date = parseDate(getAttributeValue(comment, "date"));
    const paragraphs = getChildrenByTagNameNS(comment, WORD_NS, "p");
    const text = paragraphs
      .map((p) => flattenCommentText(p))
      .join("\n")
      .trim();
    const paraId =
      paragraphs.length > 0
        ? (getAttributeValue(paragraphs[0]!, "paraId") ?? undefined)
        : undefined;
    const resolved =
      paraId !== undefined ? doneByParaId.get(paraId) : undefined;

    byDocxId.set(docxId, {
      author,
      ...(initials ? { initials } : {}),
      ...(date !== undefined ? { date } : {}),
      text,
      ...(resolved ? { resolved } : {}),
      ...(paraId ? { paraId } : {}),
    });
  }

  return byDocxId;
}

/**
 * Comment export: assigns deterministic DOCX `w:id` values to the document's
 * comments, projects each comment's anchors into per-paragraph boundary events
 * (`w:commentRangeStart` / `w:commentRangeEnd` + the `w:commentReference` run),
 * and builds the `word/comments.xml` (+ `word/commentsExtended.xml`) parts that
 * hold the comment bodies and resolved state.
 *
 * Mirrors `bookmarksXml.ts` for the range half and the footnote body builders
 * for the part half.
 */
import type { EditorComment, EditorDocument } from "@/core/model.js";
import { escapeXml, WORD_NS, WORD14_NS } from "./xmlUtils.js";

const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";

export interface CommentBoundaryEvent {
  kind: "start" | "end" | "reference";
  /** Character offset into the paragraph's flattened text. */
  offset: number;
  /** Stable emit order for boundaries that share an offset. */
  seq: number;
  /** Allocated DOCX `w:id`. */
  wId: number;
}

export type CommentEventsByParagraph = Map<string, CommentBoundaryEvent[]>;

interface AssignedComment {
  comment: EditorComment;
  wId: number;
  /** Allocated `w14:paraId` for the comment body paragraph. */
  paraId: string;
}

export interface CommentExportPlan {
  eventsByParagraph: CommentEventsByParagraph;
  comments: AssignedComment[];
}

/**
 * Allocate unique numeric `w:id`s (preferring each comment's imported hint),
 * a `w14:paraId` per comment, and group start/end/reference boundary events by
 * paragraph id. Returns `undefined` when the document has no comments.
 */
export function buildCommentExportPlan(
  document: EditorDocument,
): CommentExportPlan | undefined {
  const registry = document.comments;
  if (!registry || registry.order.length === 0) {
    return undefined;
  }

  const assignedId = new Map<string, number>();
  const used = new Set<number>();
  // First pass: honor a non-colliding imported id hint for stability.
  for (const id of registry.order) {
    const c = registry.items[id];
    if (!c) continue;
    const hint = c.docxIdHint;
    if (hint !== undefined && hint >= 0 && !used.has(hint)) {
      assignedId.set(id, hint);
      used.add(hint);
    }
  }
  // Second pass: allocate the next free id to the rest.
  let next = 0;
  for (const id of registry.order) {
    if (assignedId.has(id)) continue;
    while (used.has(next)) next += 1;
    assignedId.set(id, next);
    used.add(next);
    next += 1;
  }

  const eventsByParagraph: CommentEventsByParagraph = new Map();
  const push = (paragraphId: string, event: CommentBoundaryEvent): void => {
    const list = eventsByParagraph.get(paragraphId);
    if (list) {
      list.push(event);
    } else {
      eventsByParagraph.set(paragraphId, [event]);
    }
  };

  const comments: AssignedComment[] = [];
  registry.order.forEach((id, index) => {
    const comment = registry.items[id];
    if (!comment) return;
    const wId = assignedId.get(id)!;
    // Deterministic 8-hex paraId, unique per comment, distinct from typical
    // body paraIds (which Word writes for body paragraphs, not these).
    const paraId = (0x40000000 + index).toString(16).toUpperCase();
    comments.push({ comment, wId, paraId });

    if (comment.start) {
      push(comment.start.paragraphId, {
        kind: "start",
        offset: comment.start.offset,
        seq: comment.start.seq ?? 0,
        wId,
      });
    }
    if (comment.end) {
      push(comment.end.paragraphId, {
        kind: "end",
        offset: comment.end.offset,
        seq: comment.end.seq ?? 0,
        wId,
      });
      // The reference run sits immediately after the range end (same offset).
      push(comment.end.paragraphId, {
        kind: "reference",
        offset: comment.end.offset,
        seq: (comment.end.seq ?? 0) + 0.5,
        wId,
      });
    }
  });

  return { eventsByParagraph, comments };
}

export function serializeCommentRangeEvent(
  event: CommentBoundaryEvent,
): string {
  switch (event.kind) {
    case "start":
      return `<w:commentRangeStart w:id="${event.wId}"/>`;
    case "end":
      return `<w:commentRangeEnd w:id="${event.wId}"/>`;
    case "reference":
      // No `w:rStyle` so we never dangle a reference to an undefined style;
      // Word supplies the CommentReference style itself.
      return `<w:r><w:commentReference w:id="${event.wId}"/></w:r>`;
  }
}

const COMMENTS_XMLNS = `xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:w15="${WORD15_NS}"`;

/** Serialize one comment body paragraph, splitting on newlines via `w:br`. */
function serializeCommentBody(text: string): string {
  const lines = text.split("\n");
  const runs = lines
    .map((line, i) => {
      const brk = i > 0 ? "<w:br/>" : "";
      return `${brk}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`;
    })
    .join("");
  return `<w:r>${runs}</w:r>`;
}

/** Build `word/comments.xml` from the assigned comments. */
export function buildCommentsPartXml(plan: CommentExportPlan): string {
  const body = plan.comments
    .map(({ comment, wId, paraId }) => {
      const dateAttr =
        comment.date !== undefined
          ? ` w:date="${new Date(comment.date).toISOString().replace(/\.\d{3}Z$/, "Z")}"`
          : "";
      const initialsAttr = comment.initials
        ? ` w:initials="${escapeXml(comment.initials)}"`
        : "";
      return (
        `<w:comment w:id="${wId}" w:author="${escapeXml(comment.author)}"${dateAttr}${initialsAttr}>` +
        `<w:p w14:paraId="${paraId}">${serializeCommentBody(comment.text)}</w:p>` +
        `</w:comment>`
      );
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${COMMENTS_XMLNS}>${body}</w:comments>`;
}

/** Build `word/commentsExtended.xml` carrying the resolved/"done" state. */
export function buildCommentsExtendedPartXml(plan: CommentExportPlan): string {
  const body = plan.comments
    .map(
      ({ comment, paraId }) =>
        `<w15:commentEx w15:paraId="${paraId}" w15:done="${comment.resolved ? "1" : "0"}"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w15:commentsEx ${COMMENTS_XMLNS}>${body}</w15:commentsEx>`;
}

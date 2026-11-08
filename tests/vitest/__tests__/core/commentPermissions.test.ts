import { describe, it, expect } from "vitest";
import type { EditorComment, EditorComments } from "@/core/model.js";
import {
  canEditReviewComment,
  canDeleteReviewThread,
  type OasisReviewAccess,
} from "@/core/commands/commentPermissions.js";

const alice: OasisReviewAccess = {
  identity: { id: "stable-alice", displayName: "Alice" },
};
const bob: OasisReviewAccess = {
  identity: { id: "stable-bob", displayName: "Bob" },
};
const moderator: OasisReviewAccess = { canModerate: true };
const root: EditorComment = {
  id: "root", author: "Alice", authorId: "stable-alice", text: "Review",
};
const reply: EditorComment = {
  id: "reply", author: "Bob", authorId: "stable-bob", parentId: "root", text: "Reply",
};

describe("review authorization model", () => {
  it("uses stable owner ids, never mutable display names or imported DOCX authors", () => {
    expect(canEditReviewComment(alice, root)).toBe(true);
    expect(canEditReviewComment(bob, root)).toBe(false);
    expect(canEditReviewComment(alice, { ...root, author: "Bob" })).toBe(true);
    expect(canEditReviewComment(alice, { ...root, authorId: undefined })).toBe(false);
    expect(canEditReviewComment({ identity: { id: "", displayName: "Alice" } }, root)).toBe(false);
    expect(canEditReviewComment(moderator, { ...root, authorId: undefined })).toBe(true);
    expect(canEditReviewComment(undefined, { ...root, authorId: undefined })).toBe(true);
    expect(canEditReviewComment(alice, undefined)).toBe(false);
  });

  it("refuses deleting a parent containing another owner's replies", () => {
    const registry: EditorComments = {
      items: {
        root, reply,
        nested: { id: "nested", author: "Bob", authorId: "stable-bob", parentId: "reply", text: "Nested" },
      },
      order: ["root", "reply", "nested"],
    };
    expect(canDeleteReviewThread(alice, registry, "root")).toBe(false);
    expect(canDeleteReviewThread(bob, registry, "root")).toBe(false);
    expect(canDeleteReviewThread(bob, registry, "reply")).toBe(true);
    expect(canDeleteReviewThread(moderator, registry, "root")).toBe(true);
    expect(canDeleteReviewThread(undefined, registry, "root")).toBe(true);
    expect(canDeleteReviewThread(alice, registry, "missing")).toBe(false);
    registry.items.reply!.authorId = "stable-alice";
    registry.items.nested!.authorId = "stable-alice";
    expect(canDeleteReviewThread(alice, registry, "root")).toBe(true);
  });
});

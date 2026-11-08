import type { EditorComment, EditorComments } from "@/core/model.js";
/** Policy data is owned by core; UI is a consumer, not a dependency. */
export interface OasisReviewAccess {
  identity?: { id: string; displayName: string };
  canModerate?: boolean;
}

/**
 * Standalone / not configured: legacy local editing remains permissive.
 * Configured: only the trusted, stable host actor ID owns a comment.
 * Imported DOCX author names are presentation data, never proof of identity.
 */
export function canEditReviewComment(
  access: OasisReviewAccess | undefined,
  comment: EditorComment | undefined,
): boolean {
  if (!comment) return false;
  if (!access) return true;
  if (access.canModerate) return true;
  const actorId = access.identity?.id.trim();
  return Boolean(actorId && comment.authorId && actorId === comment.authorId);
}

/** Deleting a thread also deletes its descendants, so verify every author. */
export function canDeleteReviewThread(
  access: OasisReviewAccess | undefined,
  registry: EditorComments | undefined,
  id: string,
): boolean {
  if (!registry?.items[id]) return false;
  if (!access || access.canModerate) return true;
  if (!canEditReviewComment(access, registry.items[id])) return false;
  const checked = new Set<string>([id]);
  const queue = [id];
  const children = new Map<string, string[]>();
  for (const comment of Object.values(registry.items)) {
    if (!comment.parentId) continue;
    const list = children.get(comment.parentId) ?? [];
    list.push(comment.id);
    children.set(comment.parentId, list);
  }
  while (queue.length) {
    const current = queue.pop()!;
    for (const childId of children.get(current) ?? []) {
      if (checked.has(childId)) continue;
      checked.add(childId);
      if (!canEditReviewComment(access, registry.items[childId])) return false;
      queue.push(childId);
    }
  }
  return true;
}

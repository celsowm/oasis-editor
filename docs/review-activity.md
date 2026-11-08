# Review activity in Oasis Editor

The Review > Discussions drawer contains two views: **Discussions** and
**Activity**. Activity shows the newest comment events first, with the actor,
action, target author's display name, timestamp and an optional link to the
comment if the comment still exists.

## Recorded actions

- New comment: `comment-created`
- Reply: `comment-replied`
- Edit comment/reply body: `comment-edited`
- Resolve: `comment-resolved`
- Reopen: `comment-reopened`
- Delete a comment or reply subtree: `comment-deleted`

Each `EditorReviewActivity` stores a unique ID, comment ID, stable root
discussion ID, action kind, actor display name, optional trusted actor ID,
target author, timestamp and (for deletion) the number of deleted comments.
It intentionally **does not copy comment text** into the activity log.

Entries are appended **only after a real, permitted document mutation**,
atomically with the comment change using `applyTransactionalState`.
Cancelled dialogs, denied operations and no-op edits do not add entries.
Deleting a discussion does not delete earlier activity entries.

The `EditorDocument.reviewActivity` array is deliberately **not capped** — it
rides snapshot-based undo/redo, so truncating it in-document would desynchronize
history from state. Long sessions accumulate entries; hosts that need bounded
history should persist/rotate it out-of-band.

## Undo and collaboration

`EditorDocument.reviewActivity` is immutable editor-model data. It follows
the ordinary undo/redo history, so undoing a comment edit also removes its
activity entry from the current document state; redo restores it.

It is **not** an authenticated or tamper-evident audit log. For collaborative
or legally significant records, a server must authenticate the user, authorize
the mutation, verify concurrency/version information and append events to its
own durable, append-only audit system.

## Word DOCX

DOCX import/export preserves supported native comments, replies and resolved
states but **does not import/export `reviewActivity`**. The standard Word
comment package does not carry a trustworthy version of these editor-local
events, and `authorId` also has no native DOCX equivalent. Keeping them in
the editor document avoids inventing a nonstandard OOXML field or claiming
history survives a DOCX-only round-trip.

The in-document activity is available to hosts that serialize the full Oasis
editor document; applications that need portable history should persist it in
their own format or separate audited service.

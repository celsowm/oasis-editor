# Review comments: host identity and permissions

The Oasis Editor is a general-purpose document editor. Local, standalone editing
continues to allow the existing comment flows when no review access is specified.

## Optional host-controlled access

Supply a **trusted identity** from the application session, not from an arbitrary
text field or a value claimed by the document.

```tsx
<OasisEditorApp
  runtime={{
    review: {
      identity: { id: authenticatedUser.id, displayName: authenticatedUser.name },
      canModerate: authenticatedUser.permissions.includes("review:moderate"),
    },
  }}
/>
```

When `runtime.review` is configured:

- Creating and replying requires a nonempty user ID and display name. The
  host's display name overrides the composer input, and the model records
  `authorId` alongside the author name.
- Editing a comment, reopening/resolving it and deleting it requires ownership
  by **exact stable `authorId`** or explicit `canModerate: true`.
- A non-moderator can delete an entire thread only if every descendant comment
  also belongs to that user. Otherwise they may delete just their own reply
  subtree if they own all of it.
- All mutations recheck permissions at execution time; stale dialogs and read-only
  sessions do not save changes. Buttons also reflect eligibility.
- Filtering, navigation, and viewing discussions work while read-only.
- Without `runtime.review`, previous local-editor behavior is unchanged.

## DOCX interoperability

Standard WordprocessingML comment author names (`w:author`) are display
strings, **not verified identities**. Oasis does not infer `authorId` from a
DOCX author during import. Local `authorId` survives ordinary editor-model
serialization, but is **not part of the standard DOCX comment record**, so
exporting and importing a DOCX does not preserve ownership. In strict mode
imported comments are therefore not editable by a normal user until an
authorized application reconciles their identities. Moderators may manage them.

The editor's permission rules protect its normal interaction pathways, **not**
the security boundary of a collaborative system. A backend must authenticate
requests, authorize comment/document edits independently, and validate version
conflicts before accepting writes; clients and DOCX files are untrusted input.

## Review panel

**Review > Discussions** (`toggleCommentsPanel`) opens an editor-local panel
with text search, open/resolved filters, navigation, nested replies, author-aware
actions and two-step deletion. Both the Ribbon and the panel use the same
comment-authoring controller and immutable model operations. The panel does not
introduce a second comment store.

The Ribbon matrix marks these flows `partial` until cross-application DOCX
fidelity, visual equivalence and broader browser/accessibility testing are complete.

## Local review activity

Successful comment creation, reply, edit, resolve, reopen and delete operations
record metadata in `EditorDocument.reviewActivity`. The discussion panel has an
**Activity** view with most-recent-first chronology, event search, actor identity
and navigation to comments that still exist.

The activity array is **part of the editor document and of its undo/redo
transactions**. Undoing a comment change also undoes its activity record.
This is a user-facing edit history, not a tamper-evident, append-only security
audit. It contains the actor display name and optionally the host's stable ID,
but does not duplicate comment body text.

The activity array is **not emitted into standard DOCX**. On DOCX import,
there is no trustworthy record of local activity; author names and Word's
change-tracking data are not equivalent to an authenticated activity log.
For compliance, retention or multi-user history, the host must write an
authenticated, append-only server audit independent of the editor's undo stack.

export interface NoteWithDocxIdHint {
  docxId?: number;
}

function isUsableNoteDocxId(value: number | undefined): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value >= 1;
}

/**
 * Allocates real footnote/endnote ids while keeping imported identities stable.
 * New or conflicting ids are placed above every imported id in the registry so
 * source-backed entry preservation cannot collide with a source-only note.
 */
export function createSourceAwareNoteDocxIdAllocator<
  T extends NoteWithDocxIdHint,
>(items: Record<string, T>): (note: T) => number {
  let nextId = 1;
  for (const note of Object.values(items)) {
    if (isUsableNoteDocxId(note.docxId)) {
      nextId = Math.max(nextId, note.docxId + 1);
    }
  }

  const used = new Set<number>();
  return (note: T): number => {
    if (isUsableNoteDocxId(note.docxId) && !used.has(note.docxId)) {
      used.add(note.docxId);
      return note.docxId;
    }
    while (used.has(nextId)) nextId += 1;
    const allocated = nextId;
    used.add(allocated);
    nextId += 1;
    return allocated;
  };
}

// Shared by the inline/floating object readers (canvasInlineReaders.ts,
// canvasFloatingReaders.ts): both look up the line slot for an object's start
// offset and compute an inclusive end offset the same way.

interface LineSlot {
  offset: number;
}

/** Finds the slot at `offset`, falling back to the first slot at or after it. */
export function findSlotForOffset<TSlot extends LineSlot>(
  slots: TSlot[],
  offset: number,
): TSlot | undefined {
  return (
    slots.find((candidate): boolean => candidate.offset === offset) ??
    slots.find((candidate): boolean => candidate.offset >= offset)
  );
}

/** Ensures a fragment's end offset spans at least one character past its start. */
export function resolveInclusiveEndOffset(
  startOffset: number,
  endOffset: number,
): number {
  return endOffset > startOffset ? endOffset : startOffset + 1;
}

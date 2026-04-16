export const compareLogicalPositions = (a, b) => {
  const ak = `${a.sectionId}:${a.blockId}:${a.inlineId}:${a.offset}`;
  const bk = `${b.sectionId}:${b.blockId}:${b.inlineId}:${b.offset}`;
  return ak.localeCompare(bk);
};

export const normalizeSelection = (selection) => {
  if (!selection) return null;

  return compareLogicalPositions(selection.anchor, selection.focus) <= 0
    ? { start: selection.anchor, end: selection.focus }
    : { start: selection.focus, end: selection.anchor };
};

export const hasSelection = (selection) => {
  if (!selection) return false;
  return compareLogicalPositions(selection.anchor, selection.focus) !== 0;
};

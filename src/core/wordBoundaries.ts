export function isWordCharacter(char: string): boolean {
  return /[\p{L}\p{N}_]/u.test(char);
}

export function resolveWordSelection(
  text: string,
  offset: number,
): { start: number; end: number } {
  if (text.length === 0) {
    return { start: 0, end: 0 };
  }

  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  const index =
    clampedOffset === text.length ? Math.max(0, clampedOffset - 1) : clampedOffset;
  const charAtIndex = text[index];

  if (!charAtIndex || !isWordCharacter(charAtIndex)) {
    return {
      start: clampedOffset,
      end: Math.min(text.length, clampedOffset + 1),
    };
  }

  let start = index;
  let end = index + 1;

  while (start > 0 && isWordCharacter(text[start - 1])) {
    start -= 1;
  }

  while (end < text.length && isWordCharacter(text[end])) {
    end += 1;
  }

  return { start, end };
}

export function findPreviousWordBoundary(text: string, offset: number): number {
  if (text.length === 0) {
    return 0;
  }

  let index = Math.max(0, Math.min(offset, text.length));
  if (index === 0) {
    return 0;
  }

  if (isWordCharacter(text[index - 1] ?? "")) {
    while (index > 0 && isWordCharacter(text[index - 1] ?? "")) {
      index -= 1;
    }
    return index;
  }

  while (index > 0 && !isWordCharacter(text[index - 1] ?? "")) {
    index -= 1;
  }

  while (index > 0 && isWordCharacter(text[index - 1] ?? "")) {
    index -= 1;
  }

  return index;
}

export function findNextWordBoundary(text: string, offset: number): number {
  if (text.length === 0) {
    return 0;
  }

  let index = Math.max(0, Math.min(offset, text.length));
  if (index >= text.length) {
    return text.length;
  }

  if (isWordCharacter(text[index] ?? "")) {
    while (index < text.length && isWordCharacter(text[index] ?? "")) {
      index += 1;
    }
    while (index < text.length && !isWordCharacter(text[index] ?? "")) {
      index += 1;
    }
    return index;
  }

  while (index < text.length && !isWordCharacter(text[index] ?? "")) {
    index += 1;
  }

  return index;
}

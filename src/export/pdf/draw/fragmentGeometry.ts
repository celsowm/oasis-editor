import type {
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorCaretSlot,
} from "@/core/model.js";

export interface FragmentSlot {
  char: string;
  left: number;
  offset: number;
}

export function resolveFragmentSlots(
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
): FragmentSlot[] {
  const slotByOffset = new Map(
    line.slots.map(
      (slot): readonly [number, EditorCaretSlot] =>
        [slot.offset, slot] as const,
    ),
  );
  const result: FragmentSlot[] = [];
  for (const char of fragment.chars) {
    if (char.char === "\n" || char.char === "\t") {
      continue;
    }
    const slot = slotByOffset.get(char.paragraphOffset);
    if (!slot) {
      continue;
    }
    result.push({
      char: char.char,
      left: slot.left,
      offset: char.paragraphOffset,
    });
  }
  return result;
}

export function resolveFragmentBounds(
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  fontSizePx: number,
): { left: number; right: number } | null {
  const slots = resolveFragmentSlots(line, fragment);
  if (slots.length === 0) {
    return null;
  }

  const slotByOffset = new Map(
    line.slots.map(
      (slot): readonly [number, EditorCaretSlot] =>
        [slot.offset, slot] as const,
    ),
  );
  const first = slots[0]!;
  const last = slots[slots.length - 1]!;
  const nextSlot = slotByOffset.get(last.offset + 1);
  return {
    left: first.left,
    right: nextSlot?.left ?? last.left + fontSizePx * 0.55,
  };
}

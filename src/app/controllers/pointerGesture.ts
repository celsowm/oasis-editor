/**
 * Tracks which pointer owns an in-flight drag gesture.
 *
 * Drag sessions listen on `window`, so every pointer on the screen reaches
 * their move/up handlers. Without this filter a second finger — a thumb coming
 * to rest on the page, or the start of a pinch — would steer a drag that
 * another pointer began, snapping the dragged object to the wrong place.
 */
export interface PointerGesture {
  /** Records the pointer that started the gesture. */
  claim: (event: Pick<PointerEvent, "pointerId">) => void;
  /** Whether an event belongs to the pointer that started the gesture. */
  owns: (event: Pick<PointerEvent, "pointerId">) => boolean;
  /** Forgets the owner so the next gesture can claim it. */
  release: () => void;
}

export function createPointerGesture(): PointerGesture {
  let pointerId: number | null = null;

  return {
    claim: (event): void => {
      pointerId = event.pointerId ?? null;
    },
    // An unclaimed gesture owns everything: sessions driven by synthetic events
    // that carry no pointerId must keep working.
    owns: (event): boolean =>
      pointerId === null || event.pointerId === pointerId,
    release: (): void => {
      pointerId = null;
    },
  };
}

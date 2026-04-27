/**
 * Injectable ID generator that replaces the old module-level mutable counters.
 * Each DocumentModel can own its own generator, making tests deterministic.
 */
export class IdGenerator {
  private sectionCounter = 0;
  private blockCounter = 0;
  private runCounter = 0;
  private imageCounter = 0;
  private tableCounter = 0;

  nextSectionId(): string {
    return `section:${this.sectionCounter++}`;
  }

  nextBlockId(): string {
    return `block:${this.blockCounter++}`;
  }

  nextRunId(): string {
    return `run:${this.runCounter++}`;
  }

  nextImageId(): string {
    return `image:${this.imageCounter++}`;
  }

  nextTableId(): string {
    return `table:${this.tableCounter++}`;
  }

  /** Reset all counters (useful for testing). */
  reset(): void {
    this.sectionCounter = 0;
    this.blockCounter = 0;
    this.runCounter = 0;
    this.imageCounter = 0;
    this.tableCounter = 0;
  }
}

/** Legacy random-ID helper (kept for backward compat). */
export const genId = (prefix: string): string =>
  `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).substring(2, 8)}`;

export const createId = (): string => Math.random().toString(36).substring(2, 11);

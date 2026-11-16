import { describe, expect, it } from 'vitest';
import { EDITOR_SCROLL_PADDING_PX, resolvePageGutter } from '../../../../src/ui/editorLayoutConstants.js';

describe('page gutter', () => {
  it('preserves the existing default when omitted or invalid', () => {
    expect(EDITOR_SCROLL_PADDING_PX).toBe(34);
    for (const value of [undefined, -1, NaN, Infinity]) expect(resolvePageGutter(value)).toBe(34);
  });
  it('accepts explicit zero or a smaller inset', () => {
    expect(resolvePageGutter(0)).toBe(0);
    expect(resolvePageGutter(4)).toBe(4);
  });
});

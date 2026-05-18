import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveEffectiveTextStyle,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
  getPageContentWidth,
  getPageContentHeight,
  getPageBodyTop,
  getPageBodyBottom,
  normalizePageSettings,
  getDocumentParagraphsCanonical,
  getDocumentSectionsCanonical,
  getEditableBlocksForZone,
  getActiveSectionBlocks,
  getDocumentSections,
  getBlockParagraphs,
  EFFECTIVE_TEXT_STYLE_DEFAULTS,
  EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS,
  DEFAULT_EDITOR_PAGE_SETTINGS,
} from '../../core/model.js';
import type { EditorNamedStyle, EditorPageSettings } from '../../core/model.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const A4: EditorPageSettings = {
  width: 816,
  height: 1056,
  orientation: 'portrait',
  margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 },
};

const styles: Record<string, EditorNamedStyle> = {
  normal: {
    id: 'normal',
    name: 'Normal',
    type: 'paragraph',
    paragraphStyle: { spacingAfter: 8, lineHeight: 1.15 },
    textStyle: { fontFamily: 'Calibri, sans-serif', fontSize: 15 },
  },
  heading1: {
    id: 'heading1',
    name: 'Heading 1',
    type: 'paragraph',
    basedOn: 'normal',
    nextStyle: 'normal',
    textStyle: { fontSize: 27, bold: true },
  },
};

// ---------------------------------------------------------------------------
// resolveEffectiveTextStyle
// ---------------------------------------------------------------------------

describe('resolveEffectiveTextStyle', () => {
  it('returns full defaults when style is undefined', () => {
    const result = resolveEffectiveTextStyle(undefined, undefined);
    expect(result).toEqual(EFFECTIVE_TEXT_STYLE_DEFAULTS);
  });

  it('merges local overrides on top of defaults', () => {
    const result = resolveEffectiveTextStyle({ bold: true, fontSize: 20 }, undefined);
    expect(result.bold).toBe(true);
    expect(result.fontSize).toBe(20);
    expect(result.italic).toBe(false); // default preserved
  });

  it('resolves named style from styleId', () => {
    const result = resolveEffectiveTextStyle({ styleId: 'heading1' }, styles);
    expect(result.fontSize).toBe(27);
    expect(result.bold).toBe(true);
  });

  it('inherits basedOn chain: heading1 → normal', () => {
    const result = resolveEffectiveTextStyle({ styleId: 'heading1' }, styles);
    expect(result.fontFamily).toBe('Calibri, sans-serif'); // inherited from normal
    expect(result.fontSize).toBe(27); // overridden
  });

  it('local overrides win over named style', () => {
    const result = resolveEffectiveTextStyle({ styleId: 'heading1', fontSize: 32 }, styles);
    expect(result.fontSize).toBe(32);
    expect(result.bold).toBe(true); // still from named
  });
});

// ---------------------------------------------------------------------------
// resolveEffectiveParagraphStyle
// ---------------------------------------------------------------------------

describe('resolveEffectiveParagraphStyle', () => {
  it('returns full defaults when style is undefined', () => {
    const result = resolveEffectiveParagraphStyle(undefined, undefined);
    expect(result).toEqual(EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS);
  });

  it('applies local paragraph overrides', () => {
    const result = resolveEffectiveParagraphStyle({ align: 'center', spacingBefore: 12 }, undefined);
    expect(result.align).toBe('center');
    expect(result.spacingBefore).toBe(12);
    expect(result.spacingAfter).toBe(EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS.spacingAfter); // default
  });

  it('resolves named paragraph style by styleId', () => {
    const result = resolveEffectiveParagraphStyle({ styleId: 'normal' }, styles);
    expect(result.spacingAfter).toBe(8);
    expect(result.lineHeight).toBe(1.15);
  });
});

// ---------------------------------------------------------------------------
// resolveEffectiveTextStyleForParagraph
// ---------------------------------------------------------------------------

describe('resolveEffectiveTextStyleForParagraph', () => {
  it('inherits paragraph named style text attributes', () => {
    const result = resolveEffectiveTextStyleForParagraph(undefined, 'normal', styles);
    expect(result.fontFamily).toBe('Calibri, sans-serif');
    expect(result.fontSize).toBe(15);
  });

  it('run overrides win over paragraph style', () => {
    const result = resolveEffectiveTextStyleForParagraph({ bold: true }, 'normal', styles);
    expect(result.bold).toBe(true);
    expect(result.fontFamily).toBe('Calibri, sans-serif'); // still from paragraph
  });
});

// ---------------------------------------------------------------------------
// Page geometry
// ---------------------------------------------------------------------------

describe('Page geometry helpers', () => {
  it('getPageContentWidth subtracts left + right margins', () => {
    const width = getPageContentWidth(A4);
    expect(width).toBe(A4.width - A4.margins.left - A4.margins.right - A4.margins.gutter);
  });

  it('getPageBodyTop equals top margin', () => {
    const top = getPageBodyTop(A4);
    expect(top).toBe(A4.margins.top);
  });

  it('getPageBodyBottom is less than page height', () => {
    const bottom = getPageBodyBottom(A4);
    expect(bottom).toBeLessThan(A4.height);
    expect(bottom).toBeGreaterThan(getPageBodyTop(A4));
  });

  it('getPageContentHeight = bodyBottom - bodyTop', () => {
    const h = getPageContentHeight(A4);
    expect(h).toBe(Math.floor(getPageBodyBottom(A4) - getPageBodyTop(A4)));
  });

  it('content width has minimum of 24px', () => {
    const cramped: EditorPageSettings = {
      ...A4,
      margins: { ...A4.margins, left: 500, right: 500 },
    };
    expect(getPageContentWidth(cramped)).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// normalizePageSettings
// ---------------------------------------------------------------------------

describe('normalizePageSettings', () => {
  it('swaps width/height when portrait but width > height', () => {
    const settings: EditorPageSettings = {
      width: 1056,
      height: 816,
      orientation: 'portrait',
      margins: A4.margins,
    };
    const normalized = normalizePageSettings(settings);
    expect(normalized.width).toBe(816);
    expect(normalized.height).toBe(1056);
  });

  it('infers landscape when width > height and no orientation given', () => {
    const settings: EditorPageSettings = {
      width: 1056,
      height: 816,
      orientation: undefined,
      margins: A4.margins,
    };
    const normalized = normalizePageSettings(settings);
    expect(normalized.orientation).toBe('landscape');
    expect(normalized.width).toBe(1056);
    expect(normalized.height).toBe(816);
  });
});

// ---------------------------------------------------------------------------
// getDocumentSections
// ---------------------------------------------------------------------------

describe('getDocumentSections', () => {
  it('wraps flat blocks into a synthetic default section', () => {
    const doc = {
      id: 'doc:1',
      sections: [{ id: 'section:1', blocks: [{ id: 'p:1', type: 'paragraph' as const, runs: [] }], pageSettings: A4 }],
    };
    const sections = getDocumentSections(doc as any);
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe('section:1');
    expect(sections[0].blocks[0]?.id).toBe('p:1');
  });

  it('returns existing sections when present', () => {
    const section = {
      id: 'section:1',
      blocks: [],
      pageSettings: A4,
    };
    const doc = { id: 'doc:1', sections: [section] };
    const sections = getDocumentSections(doc as any);
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe('section:1');
  });

  it('reads canonical sections', () => {
    const sectionParagraph = { id: 'p:section', type: 'paragraph' as const, runs: [] };
    const doc = {
      id: 'doc:1',
      sections: [{ id: 'section:1', blocks: [sectionParagraph], pageSettings: A4 }],
    };
    const sections = getDocumentSectionsCanonical(doc as any);
    expect(sections).toHaveLength(1);
    expect(sections[0].blocks[0]?.id).toBe('p:section');
  });
});

describe('canonical block/paragraph helpers', () => {
  it('returns canonical paragraphs from sections when blocks is empty', () => {
    const sectionParagraph = { id: 'p:1', type: 'paragraph' as const, runs: [] };
    const doc = {
      id: 'doc:1',
      sections: [{ id: 'section:1', blocks: [sectionParagraph], pageSettings: A4 }],
    };
    const paragraphs = getDocumentParagraphsCanonical(doc as any);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]?.id).toBe('p:1');
  });

  it('resolves active section blocks and zone blocks canonically', () => {
    const main = { id: 'p:main', type: 'paragraph' as const, runs: [] };
    const header = { id: 'p:header', type: 'paragraph' as const, runs: [] };
    const footer = { id: 'p:footer', type: 'paragraph' as const, runs: [] };
    const state = {
      document: {
        id: 'doc:1',
        sections: [{
          id: 'section:1',
          pageSettings: A4,
          blocks: [main],
          header: [header],
          footer: [footer],
        }],
      },
      selection: {
        anchor: { paragraphId: 'p:main', runId: 'r:1', offset: 0 },
        focus: { paragraphId: 'p:main', runId: 'r:1', offset: 0 },
      },
      activeSectionIndex: 0,
      activeZone: 'main',
    };

    expect(getActiveSectionBlocks(state as any).map((b) => b.id)).toEqual(['p:main']);
    expect(getEditableBlocksForZone(state as any, 'header').map((b) => b.id)).toEqual(['p:header']);
    expect(getEditableBlocksForZone(state as any, 'footer').map((b) => b.id)).toEqual(['p:footer']);
  });
});

// ---------------------------------------------------------------------------
// getBlockParagraphs
// ---------------------------------------------------------------------------

describe('getBlockParagraphs', () => {
  it('returns the block itself for a paragraph node', () => {
    const block = { id: 'p:1', type: 'paragraph' as const, runs: [] };
    const result = getBlockParagraphs(block);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(block);
  });

  it('flattens all cell paragraphs from a table', () => {
    const p1 = { id: 'p:1', type: 'paragraph' as const, runs: [] };
    const p2 = { id: 'p:2', type: 'paragraph' as const, runs: [] };
    const table = {
      id: 'table:1',
      type: 'table' as const,
      rows: [
        { id: 'row:1', cells: [{ id: 'cell:1', blocks: [p1] }, { id: 'cell:2', blocks: [p2] }] },
      ],
    };
    const result = getBlockParagraphs(table);
    expect(result).toHaveLength(2);
    expect(result).toContain(p1);
    expect(result).toContain(p2);
  });
});

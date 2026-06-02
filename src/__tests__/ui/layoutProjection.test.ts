import { describe, it, expect, beforeEach } from 'vitest';
import { projectParagraphLayout, projectBlocksLayout, estimateParagraphBlockHeight } from '../../ui/layoutProjection.js';
import { createEditorParagraph, createEditorDocument } from '../../core/editorState.js';
import type { EditorPageSettings } from '../../core/model.js';

const A4: EditorPageSettings = {
  width: 816,
  height: 1056,
  orientation: 'portrait',
  margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 },
};

describe('layout projection', () => {
  describe('projectParagraphLayout', () => {
    it('projects a simple paragraph into a single line', () => {
      const p = createEditorParagraph('hello');
      const layout = projectParagraphLayout(p, 0, 1, undefined, 600);
      
      expect(layout.paragraphId).toBe(p.id);
      expect(layout.text).toBe('hello');
      expect(layout.lines).toHaveLength(1);
      expect(layout.lines[0].fragments).toHaveLength(1);
      expect(layout.lines[0].fragments[0].text).toBe('hello');
    });

    it('splits long text into multiple lines', () => {
      // With a very narrow width, text should split.
      const p = createEditorParagraph('This is a very long paragraph that should definitely wrap into multiple lines given the width constraints of the layout engine.');
      const layout = projectParagraphLayout(p, 0, 1, undefined, 50); 
      
      expect(layout.lines.length).toBeGreaterThan(1);
    });
  });

  describe('projectBlocksLayout', () => {
    it('places blocks on a single page if they fit', () => {
      const p1 = createEditorParagraph('p1');
      const p2 = createEditorParagraph('p2');
      const pages = projectBlocksLayout({ blocks: [p1, p2], pageSettings: A4, maxPageHeight: 800 });
      
      expect(pages).toHaveLength(1);
      expect(pages[0].blocks).toHaveLength(2);
    });

    it('keeps spacing before for the first paragraph on a page', () => {
      const p = createEditorParagraph('heading');
      p.style = { spacingBefore: 24, spacingAfter: 0 };
      const pages = projectBlocksLayout({ blocks: [p], pageSettings: A4, maxPageHeight: 800 });
      const block = pages[0]!.blocks[0]!;
      const lineHeights = block.layout!.lines.reduce((sum, line) => sum + line.height, 0);

      expect(block.layout?.startOffset).toBe(0);
      expect(block.estimatedHeight).toBeCloseTo(lineHeights + 24, 4);
    });

    it('does not repeat spacing before on a continued paragraph segment', () => {
      const p = createEditorParagraph('word '.repeat(80));
      p.style = { spacingBefore: 24, spacingAfter: 0, widowControl: false };
      const pages = projectBlocksLayout({ blocks: [p], pageSettings: A4, maxPageHeight: 50 });
      const continuedBlock = pages.find((page) => (page.blocks[0]?.layout?.startOffset ?? 0) > 0)?.blocks[0];
      const lineHeights = continuedBlock!.layout!.lines.reduce((sum, line) => sum + line.height, 0);

      expect(continuedBlock).toBeDefined();
      expect(continuedBlock!.estimatedHeight).toBeCloseTo(lineHeights, 4);
    });

    it('creates new pages for overflowing blocks', () => {
      const blocks = Array.from({ length: 50 }, (_, i) => createEditorParagraph(`Paragraph ${i}`));
      // maxPageHeight 100 is very small, should force many pages
      const pages = projectBlocksLayout({ blocks, pageSettings: A4, maxPageHeight: 100 });
      
      expect(pages.length).toBeGreaterThan(1);
    });

    it('keeps a Word-like final paragraph on the page when only trailing spacing overflows', () => {
      const pageSettings: EditorPageSettings = {
        width: 794,
        height: 1123,
        orientation: 'portrait',
        margins: { top: 94, right: 113, bottom: 94, left: 113, header: 47, footer: 47, gutter: 0 },
      };
      const blocks = Array.from({ length: 29 }, (_, index) => {
        const paragraph = createEditorParagraph(index === 28 ? 'Das' : `P${index + 1}`);
        paragraph.style = { spacingAfter: 11, lineHeight: 1.1 };
        return paragraph;
      });
      const nextPage = createEditorParagraph('sd');
      nextPage.style = { spacingAfter: 11, lineHeight: 1.1, pageBreakBefore: true };

      const pages = projectBlocksLayout({
        blocks: [...blocks, nextPage],
        pageSettings,
        maxPageHeight: 935,
        layoutMode: 'wordParity',
      });

      expect(pages).toHaveLength(2);
      expect(pages[0]!.blocks).toHaveLength(29);
      expect(pages[0]!.blocks.at(-1)?.layout?.text).toBe('Das');
      expect(pages[1]!.blocks[0]?.layout?.text).toBe('sd');
    });

    it('keeps a final paragraph on the page in fast mode when only trailing spacing overflows', () => {
      const pageSettings: EditorPageSettings = {
        width: 794,
        height: 1123,
        orientation: 'portrait',
        margins: { top: 94, right: 113, bottom: 94, left: 113, header: 47, footer: 47, gutter: 0 },
      };
      const blocks = Array.from({ length: 29 }, (_, index) => {
        const paragraph = createEditorParagraph(index === 28 ? 'Das' : `P${index + 1}`);
        paragraph.style = { spacingAfter: 11, lineHeight: 1.1 };
        return paragraph;
      });
      const nextPage = createEditorParagraph('sd');
      nextPage.style = { spacingAfter: 11, lineHeight: 1.1, pageBreakBefore: true };

      const pages = projectBlocksLayout({
        blocks: [...blocks, nextPage],
        pageSettings,
        maxPageHeight: 935,
        layoutMode: 'fast',
      });

      expect(pages).toHaveLength(2);
      expect(pages[0]!.blocks).toHaveLength(29);
      expect(pages[0]!.blocks.at(-1)?.layout?.text).toBe('Das');
      expect(pages[1]!.blocks[0]?.layout?.text).toBe('sd');
    });
  });

  describe('estimateParagraphBlockHeight', () => {
    it('estimates height including spacing', () => {
      const p = createEditorParagraph('hello');
      p.style = { spacingBefore: 10, spacingAfter: 20 };
      const height = estimateParagraphBlockHeight(p, undefined, 600);
      
      // height = spacingBefore + spacingAfter + lineHeights
      // Default line height for 15px font is usually around 17-18px
      expect(height).toBeGreaterThan(30); 
    });
  });
});

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

describe('Layout Projection', () => {
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
      // MIN_CONTENT_WIDTH is 120, so we need enough text to exceed that.
      const p = createEditorParagraph('This is a very long paragraph that should definitely wrap into multiple lines given the width constraints of the layout engine.');
      const layout = projectParagraphLayout(p, 0, 1, undefined, 50); 
      
      expect(layout.lines.length).toBeGreaterThan(1);
    });
  });

  describe('projectBlocksLayout', () => {
    it('places blocks on a single page if they fit', () => {
      const p1 = createEditorParagraph('p1');
      const p2 = createEditorParagraph('p2');
      const pages = projectBlocksLayout([p1, p2], A4, 800);
      
      expect(pages).toHaveLength(1);
      expect(pages[0].blocks).toHaveLength(2);
    });

    it('creates new pages for overflowing blocks', () => {
      const blocks = Array.from({ length: 50 }, (_, i) => createEditorParagraph(`Paragraph ${i}`));
      // maxPageHeight 100 is very small, should force many pages
      const pages = projectBlocksLayout(blocks, A4, 100);
      
      expect(pages.length).toBeGreaterThan(1);
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

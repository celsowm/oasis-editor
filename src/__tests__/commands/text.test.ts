import { describe, it, expect, beforeEach } from 'vitest';
import { createEditorStateFromTexts, resetEditorIds } from '../../core/editorState.js';
import { insertTextAtSelection, deleteBackward, deleteForward, toggleTextStyle, moveOrCopySelectionToPosition } from '../../core/commands/text.js';
import { paragraphOffsetToPosition } from '../../core/model.js';
import { getParagraphs } from '../../core/model.js';

beforeEach(() => {
  resetEditorIds();
});

describe('text commands', () => {
  describe('insertTextAtSelection', () => {
    it('inserts text at the beginning of a paragraph', () => {
      const state = createEditorStateFromTexts(['world']);
      const nextState = insertTextAtSelection(state, 'hello ');
      const paragraphs = getParagraphs(nextState);
      expect(paragraphs[0].runs[0].text).toBe('hello world');
      expect(nextState.selection.focus.offset).toBe(6);
    });

    it('inserts text in the middle of a paragraph', () => {
      const state = createEditorStateFromTexts(['hworld'], { offset: 1 });
      const nextState = insertTextAtSelection(state, 'ello ');
      const paragraphs = getParagraphs(nextState);
      expect(paragraphs[0].runs[0].text).toBe('hello world');
    });

    it('replaces selection with new text', () => {
      const state = createEditorStateFromTexts(['hello world'], {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 5 }
      });
      const nextState = insertTextAtSelection(state, 'bye');
      const paragraphs = getParagraphs(nextState);
      expect(paragraphs[0].runs[0].text).toBe('bye world');
    });
  });

  describe('deleteBackward', () => {
    it('deletes character before cursor', () => {
      const state = createEditorStateFromTexts(['hello'], { offset: 5 });
      const nextState = deleteBackward(state);
      expect(getParagraphs(nextState)[0].runs[0].text).toBe('hell');
    });

    it('merges paragraphs when deleting at start of second paragraph', () => {
      const state = createEditorStateFromTexts(['one', 'two'], { blockIndex: 1, offset: 0 });
      const nextState = deleteBackward(state);
      const paragraphs = getParagraphs(nextState);
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].runs[0].text).toBe('onetwo');
    });
  });

  describe('deleteForward', () => {
    it('deletes character after cursor', () => {
      const state = createEditorStateFromTexts(['hello'], { offset: 0 });
      const nextState = deleteForward(state);
      expect(getParagraphs(nextState)[0].runs[0].text).toBe('ello');
    });

    it('merges paragraphs when deleting at end of first paragraph', () => {
      const state = createEditorStateFromTexts(['one', 'two'], { blockIndex: 0, offset: 3 });
      const nextState = deleteForward(state);
      const paragraphs = getParagraphs(nextState);
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].runs[0].text).toBe('onetwo');
    });
  });

  describe('toggleTextStyle', () => {
    it('applies bold style to selected text', () => {
      const state = createEditorStateFromTexts(['hello world'], {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 5 }
      });
      const nextState = toggleTextStyle(state, 'bold');
      const paragraphs = getParagraphs(nextState);
      // It should split into "hello" (bold) and " world" (normal)
      expect(paragraphs[0].runs).toHaveLength(2);
      expect(paragraphs[0].runs[0].text).toBe('hello');
      expect(paragraphs[0].runs[0].styles?.bold).toBe(true);
      expect(paragraphs[0].runs[1].text).toBe(' world');
      expect(paragraphs[0].runs[1].styles?.bold).toBeFalsy();
    });
  });

  describe('moveOrCopySelectionToPosition', () => {
    it('moves selection in same paragraph', () => {
      const state = createEditorStateFromTexts(['hello world'], {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 5 }
      });
      const paragraph = getParagraphs(state)[0];
      const target = paragraphOffsetToPosition(paragraph, 11);
      const next = moveOrCopySelectionToPosition(state, target);
      expect(getParagraphs(next)[0].runs[0].text).toBe(' worldhello');
    });

    it('moves multi-paragraph selection', () => {
      const state = createEditorStateFromTexts(['one', 'two', 'three'], {
        anchor: { blockIndex: 0, offset: 1 },
        focus: { blockIndex: 1, offset: 2 }
      });
      const destinationParagraph = getParagraphs(state)[2];
      const target = paragraphOffsetToPosition(destinationParagraph, 5);
      const next = moveOrCopySelectionToPosition(state, target);
      const texts = getParagraphs(next).map((p) => p.runs.map((r) => r.text).join(''));
      expect(texts).toEqual(['oo', 'threene', 'tw']);
    });

    it('copies selection when copy option is enabled', () => {
      const state = createEditorStateFromTexts(['hello world'], {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 5 }
      });
      const paragraph = getParagraphs(state)[0];
      const target = paragraphOffsetToPosition(paragraph, 11);
      const next = moveOrCopySelectionToPosition(state, target, { copy: true });
      expect(getParagraphs(next)[0].runs[0].text).toBe('hello worldhello');
    });

    it('returns no-op when target is inside current selection', () => {
      const state = createEditorStateFromTexts(['hello world'], {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 5 }
      });
      const paragraph = getParagraphs(state)[0];
      const target = paragraphOffsetToPosition(paragraph, 2);
      const next = moveOrCopySelectionToPosition(state, target);
      expect(next).toBe(state);
    });
  });
});

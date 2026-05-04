import { createEffect, createSignal, on } from "solid-js";
import { findMatchesInDocument, type FindOptions, type FindReplaceMatch } from "../services/FindReplaceService.js";
import type { EditorState } from "../../core/model.js";
import { setSelection, insertTextAtSelection } from "../../core/editorCommands.js";

export interface UseEditorFindReplaceResult {
  searchTerm: () => string;
  setSearchTerm: (term: string) => void;
  replaceTerm: () => string;
  setReplaceTerm: (term: string) => void;
  findOptions: () => FindOptions;
  setFindOptions: (options: FindOptions) => void;
  matches: () => FindReplaceMatch[];
  currentIndex: () => number;
  findNext: () => void;
  findPrevious: () => void;
  replace: () => void;
  replaceAll: () => void;
  isOpen: () => boolean;
  setIsOpen: (open: boolean) => void;
}

export interface FindReplaceDeps {
  state: EditorState;
  applyState: (next: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string }
  ) => void;
  focusInput: () => void;
}

export function useEditorFindReplace(deps: FindReplaceDeps): UseEditorFindReplaceResult {
  const [searchTerm, setSearchTerm] = createSignal("");
  const [replaceTerm, setReplaceTerm] = createSignal("");
  const [findOptions, setFindOptions] = createSignal<FindOptions>({
    matchCase: false,
    wholeWord: false,
  });
  const [matches, setMatches] = createSignal<FindReplaceMatch[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(-1);
  const [isOpen, setIsOpen] = createSignal(false);

  // Update matches when search term, options or document changes
  createEffect(on([() => deps.state.document, searchTerm, findOptions], ([doc, term, options]) => {
    const newMatches = findMatchesInDocument(doc, term, options);
    setMatches(newMatches);
    
    // Try to preserve current match or reset to -1 if no matches
    if (newMatches.length === 0) {
      setCurrentIndex(-1);
    } else if (currentIndex() >= newMatches.length) {
      setCurrentIndex(0);
    } else if (currentIndex() === -1) {
      // Default to first match if we just started searching
      setCurrentIndex(0);
    }
  }));

  const selectMatch = (index: number) => {
    const match = matches()[index];
    if (!match) return;

    deps.applyState(setSelection(deps.state, {
      anchor: match.anchor,
      focus: match.focus,
    }));
    // We don't focus the main input here because we want to stay in the Find dialog
  };

  const findNext = () => {
    const total = matches().length;
    if (total === 0) return;
    const nextIndex = (currentIndex() + 1) % total;
    setCurrentIndex(nextIndex);
    selectMatch(nextIndex);
  };

  const findPrevious = () => {
    const total = matches().length;
    if (total === 0) return;
    const prevIndex = (currentIndex() - 1 + total) % total;
    setCurrentIndex(prevIndex);
    selectMatch(prevIndex);
  };

  const replace = () => {
    const total = matches().length;
    if (total === 0 || currentIndex() === -1) return;

    const match = matches()[currentIndex()];
    
    // Ensure the current match is indeed selected before replacing
    // If user moved cursor, we might be replacing wrong thing.
    // Standard behavior: replace selected match and move to next.
    
    deps.applyTransactionalState((current) => {
      const stateWithSelection = setSelection(current, {
        anchor: match.anchor,
        focus: match.focus,
      });
      return insertTextAtSelection(stateWithSelection, replaceTerm());
    }, { mergeKey: "findReplace" });

    // After replacement, the matches will be updated by the effect.
    // The effect should handle index adjustment.
    // If we were at the last match, we might go to 0 or stay at same index (which is now a NEW match)
  };

  const replaceAll = () => {
    const currentMatches = matches();
    if (currentMatches.length === 0) return;

    deps.applyTransactionalState((current) => {
      let workingState = current;
      // Replace backwards to avoid shifting offsets of subsequent matches
      for (let i = currentMatches.length - 1; i >= 0; i--) {
        const m = currentMatches[i];
        workingState = setSelection(workingState, {
          anchor: m.anchor,
          focus: m.focus,
        });
        workingState = insertTextAtSelection(workingState, replaceTerm());
      }
      return workingState;
    }, { mergeKey: "findReplaceAll" });
    
    setIsOpen(false);
    deps.focusInput();
  };

  return {
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    findOptions,
    setFindOptions,
    matches,
    currentIndex,
    findNext,
    findPrevious,
    replace,
    replaceAll,
    isOpen,
    setIsOpen,
  };
}

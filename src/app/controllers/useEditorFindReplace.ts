import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import { createEffect, createSignal, on } from "solid-js";
import {
  findMatchesInDocument,
  type FindOptions,
  type FindReplaceMatch,
} from "@/app/services/FindReplaceService.js";
import { replaceAllInDocument } from "@/core/commands/findReplace.js";
import type { EditorState, EditorDocument } from "@/core/model.js";
import { setSelection } from "@/core/commands/selection.js";
import { insertTextAtSelection } from "@/core/commands/text.js";

/** Result of the {@link useEditorFindReplace} hook. */
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

/** Dependencies required by {@link useEditorFindReplace}. */
export interface FindReplaceDeps {
  state: EditorState;
  applyState: (next: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  focusInput: () => void;
}

/**
 * SolidJS hook that drives find-and-replace state and actions.
 * @param deps - The dependencies required by the hook.
 * @returns The find/replace state and action methods.
 */
export function useEditorFindReplace(
  deps: FindReplaceDeps,
): UseEditorFindReplaceResult {
  const [searchTerm, setSearchTerm] = createSignal("");
  const [replaceTerm, setReplaceTerm] = createSignal("");
  const [findOptions, setFindOptions] = createSignal<FindOptions>({
    matchCase: false,
    wholeWord: false,
  });
  const [matches, setMatches] = createSignal<FindReplaceMatch[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(-1);
  const [isOpen, setIsOpen] = createSignal(false);

  createEffect(
    on(
      [(): EditorDocument => deps.state.document, searchTerm, findOptions],
      ([doc, term, options]): void => {
        const newMatches = findMatchesInDocument(doc, term, options);
        setMatches(newMatches);

        if (newMatches.length === 0) {
          setCurrentIndex(-1);
        } else if (currentIndex() >= newMatches.length) {
          setCurrentIndex(0);
        } else if (currentIndex() === -1) {
          setCurrentIndex(0);
        }
      },
    ),
  );

  const selectMatch = (index: number): void => {
    const match = matches()[index];
    if (!match) return;

    deps.applyState(
      setSelection(deps.state, {
        anchor: match.anchor,
        focus: match.focus,
      }),
    );
  };

  const findNext = (): void => {
    const total = matches().length;
    if (total === 0) return;
    const nextIndex = (currentIndex() + 1) % total;
    setCurrentIndex(nextIndex);
    selectMatch(nextIndex);
  };

  const findPrevious = (): void => {
    const total = matches().length;
    if (total === 0) return;
    const prevIndex = (currentIndex() - 1 + total) % total;
    setCurrentIndex(prevIndex);
    selectMatch(prevIndex);
  };

  const replace = (): void => {
    const total = matches().length;
    if (total === 0 || currentIndex() === -1) return;

    const match = matches()[currentIndex()];

    deps.applyTransactionalState(
      (current): EditorState => {
        const stateWithSelection = setSelection(current, {
          anchor: match.anchor,
          focus: match.focus,
        });
        return insertTextAtSelection(stateWithSelection, replaceTerm());
      },
      { mergeKey: MERGE_KEYS.findReplace },
    );
  };

  const replaceAll = (): void => {
    const search = searchTerm();
    if (search.length === 0) return;

    deps.applyTransactionalState(
      (current): EditorState =>
        replaceAllInDocument(current, search, replaceTerm(), findOptions()),
      { mergeKey: MERGE_KEYS.findReplaceAll },
    );

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

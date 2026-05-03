import { Show, type JSX } from "solid-js";
import type { UseEditor2FindReplaceResult } from "../../../app/controllers/useEditor2FindReplace.js";

export interface FindReplaceDialogProps {
  fr: UseEditor2FindReplaceResult;
}

export function FindReplaceDialog(props: FindReplaceDialogProps) {
  const { fr } = props;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        fr.findPrevious();
      } else {
        fr.findNext();
      }
    } else if (e.key === "Escape") {
      fr.setIsOpen(false);
    }
  };

  return (
    <Show when={fr.isOpen()}>
      <div 
        class="oasis-editor-2-find-replace-dialog"
        onKeyDown={handleKeyDown}
      >
        <div class="oasis-editor-2-fr-header">
          <span>Find & Replace</span>
          <button 
            class="oasis-editor-2-fr-close" 
            onClick={() => fr.setIsOpen(false)}
            aria-label="Close"
          >
            <i data-lucide="x" />
          </button>
        </div>

        <div class="oasis-editor-2-fr-body">
          <div class="oasis-editor-2-fr-input-group">
            <div class="oasis-editor-2-fr-input-wrapper">
              <input
                type="text"
                placeholder="Find"
                value={fr.searchTerm()}
                onInput={(e) => fr.setSearchTerm(e.currentTarget.value)}
                autofocus
                class="oasis-editor-2-fr-input"
              />
              <span class="oasis-editor-2-fr-counter">
                {fr.matches().length > 0 ? `${fr.currentIndex() + 1} / ${fr.matches().length}` : "No matches"}
              </span>
            </div>
            
            <div class="oasis-editor-2-fr-actions">
              <button 
                onClick={fr.findPrevious} 
                disabled={fr.matches().length === 0}
                title="Previous Match (Shift+Enter)"
              >
                <i data-lucide="chevron-up" />
              </button>
              <button 
                onClick={fr.findNext} 
                disabled={fr.matches().length === 0}
                title="Next Match (Enter)"
              >
                <i data-lucide="chevron-down" />
              </button>
            </div>
          </div>

          <div class="oasis-editor-2-fr-input-group">
            <input
              type="text"
              placeholder="Replace with"
              value={fr.replaceTerm()}
              onInput={(e) => fr.setReplaceTerm(e.currentTarget.value)}
              class="oasis-editor-2-fr-input"
            />
            <div class="oasis-editor-2-fr-actions">
              <button 
                class="oasis-editor-2-fr-btn-text" 
                onClick={fr.replace}
                disabled={fr.matches().length === 0}
              >
                Replace
              </button>
              <button 
                class="oasis-editor-2-fr-btn-text" 
                onClick={fr.replaceAll}
                disabled={fr.matches().length === 0}
              >
                All
              </button>
            </div>
          </div>

          <div class="oasis-editor-2-fr-options">
            <label class="oasis-editor-2-fr-checkbox">
              <input
                type="checkbox"
                checked={fr.findOptions().matchCase}
                onChange={(e) => fr.setFindOptions({ ...fr.findOptions(), matchCase: e.currentTarget.checked })}
              />
              <span>Match case</span>
            </label>
            <label class="oasis-editor-2-fr-checkbox">
              <input
                type="checkbox"
                checked={fr.findOptions().wholeWord}
                onChange={(e) => fr.setFindOptions({ ...fr.findOptions(), wholeWord: e.currentTarget.checked })}
              />
              <span>Whole word</span>
            </label>
          </div>
        </div>
      </div>
    </Show>
  );
}

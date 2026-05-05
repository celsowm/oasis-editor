import { createSignal, createEffect, onCleanup, type JSX } from "solid-js";
import { t } from "../../../i18n/index.js";

export interface TitleBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  children?: JSX.Element;
}

export function TitleBar(props: TitleBarProps) {
  const [editingTitle, setEditingTitle] = createSignal(props.title);
  
  createEffect(() => {
    setEditingTitle(props.title);
  });

  const handleBlur = () => {
    let finalTitle = editingTitle().trim();
    if (!finalTitle) {
      finalTitle = "Untitled document"; // Default title
      setEditingTitle(finalTitle);
    }
    props.onTitleChange(finalTitle);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.currentTarget as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditingTitle(props.title);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  // Sync browser title
  createEffect(() => {
    document.title = `${props.title} - Oasis Editor`;
    onCleanup(() => {
      document.title = "Oasis Editor";
    });
  });

  return (
    <div
      class="oasis-titlebar"
    >
      <div class="oasis-titlebar-left">
        <div class="oasis-titlebar-doc-icon" aria-hidden="true">
          <i data-lucide="file-text" />
        </div>

        <div class="oasis-titlebar-title-stack">
          <div class="oasis-titlebar-title-row">
            <input
              type="text"
              value={editingTitle()}
              onInput={(e) => setEditingTitle(e.currentTarget.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              aria-label="Document Title"
              class="oasis-titlebar-title-input"
              onFocus={(e) => {
                e.currentTarget.select();
              }}
            />
            <button type="button" class="oasis-titlebar-icon-button" aria-label="Star document" title="Star document">
              <i data-lucide="star" />
            </button>
            <button type="button" class="oasis-titlebar-icon-button" aria-label="Move document" title="Move document">
              <i data-lucide="folder" />
            </button>
          </div>
          <div class="oasis-titlebar-menubar-slot">
            {props.children}
          </div>
        </div>
      </div>

      <div class="oasis-titlebar-actions">
        <button
          onClick={() => alert("Share dialog placeholder")}
          class="oasis-titlebar-share"
          type="button"
        >
          <i data-lucide="lock-keyhole" />
          <span>{t("title.share") || "Share"}</span>
        </button>
        <div class="oasis-titlebar-avatar" aria-label="Current user">
          U
        </div>
      </div>
    </div>
  );
}

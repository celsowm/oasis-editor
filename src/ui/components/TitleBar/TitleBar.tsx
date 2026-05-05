import { createSignal, createEffect, onCleanup, Show, type JSX } from "solid-js";
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
      style={{
        display: "flex",
        "align-items": "center",
        "justify-content": "space-between",
        "min-height": "64px",
        padding: "8px 16px",
        "background-color": "var(--oasis-toolbar-bg)",
        "font-family": "var(--oasis-font-ui)",
        color: "var(--oasis-text)",
        "box-sizing": "border-box",
      }}
    >
      <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
        {/* Placeholder Icon */}
        <div
          style={{
            width: "32px",
            height: "32px",
            "background-color": "var(--oasis-accent)",
            "border-radius": "4px",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            color: "white",
            "font-weight": "bold",
            "font-size": "18px",
            "user-select": "none",
          }}
        >
          O
        </div>

        <div style={{ display: "flex", "flex-direction": "column" }}>
          <div style={{ display: "flex", "align-items": "center" }}>
            <input
              type="text"
              value={editingTitle()}
              onInput={(e) => setEditingTitle(e.currentTarget.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              aria-label="Document Title"
              style={{
                border: "1px solid transparent",
                "background-color": "transparent",
                "font-family": "var(--oasis-font-ui)",
                "font-size": "16px",
                color: "var(--oasis-text)",
                padding: "2px 6px",
                "border-radius": "4px",
                outline: "none",
                margin: "0",
                "box-sizing": "border-box",
                "min-width": "150px",
              }}
              onMouseEnter={(e) => {
                if (document.activeElement !== e.currentTarget) {
                  e.currentTarget.style.border = "1px solid var(--oasis-toolbar-border)";
                }
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.currentTarget) {
                  e.currentTarget.style.border = "1px solid transparent";
                }
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = "1px solid var(--oasis-accent)";
                e.currentTarget.select();
              }}
            />
            <span style={{ "font-size": "14px", color: "var(--oasis-text-muted)", cursor: "pointer", "margin-left": "8px" }}>☆</span>
            <span style={{ "font-size": "14px", color: "var(--oasis-text-muted)", cursor: "pointer", "margin-left": "8px" }}>📁</span>
          </div>
          <div style={{ "margin-top": "-2px", "margin-left": "-2px" }}>
            {props.children}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", "align-items": "center", gap: "16px" }}>
        <button
          onClick={() => alert("Share dialog placeholder")}
          style={{
            "background-color": "var(--oasis-accentSoft, #c2e7ff)",
            color: "var(--oasis-text, #001d35)",
            border: "none",
            padding: "8px 24px",
            "border-radius": "20px",
            "font-family": "var(--oasis-font-ui)",
            "font-weight": "500",
            cursor: "pointer",
            display: "flex",
            "align-items": "center",
            gap: "8px",
          }}
        >
          🔒 Share
        </button>
        <div
          style={{
            width: "32px",
            height: "32px",
            "border-radius": "50%",
            "background-color": "#5b42f3",
            color: "white",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "font-weight": "bold",
          }}
        >
          U
        </div>
      </div>
    </div>
  );
}
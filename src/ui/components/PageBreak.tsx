import { t } from "../../i18n/index.js";

export interface PageBreakProps {
  pageIndex: number;
}

export function PageBreak(_props: PageBreakProps) {
  return (
    <div
      class="oasis-editor-page-break"
      style={{
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        margin: "16px 0",
        position: "relative",
        "user-select": "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          "border-top": "1px dashed var(--oasis-toolbar-border, #e0e3e7)",
        }}
      />
      <div
        style={{
          background: "var(--oasis-bg, #f6f8fb)",
          padding: "0 12px",
          color: "var(--oasis-text-muted, #5f6368)",
          "font-size": "12px",
          "font-family": "var(--oasis-font-ui, sans-serif)",
          "z-index": 1,
        }}
      >
        {t("metric.pageBreak") || "Page Break"}
      </div>
    </div>
  );
}

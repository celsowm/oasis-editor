import { useI18n } from "@/i18n/I18nContext.js";

export interface FontPreviewProps {
  class?: string;
  testId: string;
  style: Record<string, string | number | undefined>;
}

export function FontPreview(props: FontPreviewProps) {
  const t = useI18n();
  return (
    <div
      class={props.class ?? "oasis-editor-dialog-preview"}
      data-testid={props.testId}
      style={props.style}
    >
      {t("dialog.font.previewText")}
    </div>
  );
}

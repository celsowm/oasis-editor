import { Show } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";

import { OasisBrandMark } from "./OasisBrandMark.js";
import { enablePreciseFontMode } from "@/ui/app/localFontAccess.js";
import {
  setPreciseFontPreference,
  setWelcomeSeen,
} from "@/app/services/userPreferences.js";

interface WelcomeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * First-use welcome, rendered as an overlay that fills the editor container
 * (reusing the loading-overlay positioning) rather than a viewport modal. Offers
 * opt-in precise font mode; the Enable/Skip handlers drive the Local Font Access
 * orchestration, persist the choice, and close. Shown once (gated by
 * `welcomeSeen` in user preferences).
 */
export function WelcomeOverlay(props: WelcomeOverlayProps) {
  const t = useI18n();
  const handleEnable = () => {
    void enablePreciseFontMode();
    setWelcomeSeen();
    props.onClose();
  };

  const handleSkip = () => {
    setPreciseFontPreference(false);
    setWelcomeSeen();
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="oasis-editor-welcome-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oasis-editor-welcome-title"
      >
        <div class="oasis-editor-welcome-card">
          <OasisBrandMark height={72} class="oasis-editor-welcome-mark" />
          <h2
            id="oasis-editor-welcome-title"
            class="oasis-editor-welcome-title"
          >
            {t("welcome.title")}
          </h2>
          <p class="oasis-editor-welcome-body">{t("welcome.body")}</p>
          <p class="oasis-editor-welcome-note">{t("welcome.note")}</p>
          <div class="oasis-editor-welcome-actions">
            <button
              class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
              onClick={handleSkip}
              data-testid="editor-welcome-skip"
            >
              {t("welcome.skip")}
            </button>
            <button
              class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
              onClick={handleEnable}
              data-testid="editor-welcome-enable"
            >
              {t("welcome.enable")}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}

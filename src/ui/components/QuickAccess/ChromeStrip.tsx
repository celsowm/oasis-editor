import type { Accessor, JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Text } from "@/ui/public/Text.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { QuickAccessToolbar } from "./QuickAccessToolbar.js";
import type { QuickAccessCatalogItem } from "@/ui/app/quickAccessCatalog.js";

export interface ChromeStripProps {
  catalog: readonly QuickAccessCatalogItem[];
  visible: Accessor<string[]>;
  onToggle: (command: string) => void;
  onExecute: (command: string) => void;
  canExecute: (command: string) => boolean;
  /** Bumps on every command bus execution; forces the strip to re-read state. */
  tick: () => number;
  onOpenCommandSearch: () => void;
}

/**
 * The slim chrome strip above the ribbon: Quick Access Toolbar on the left,
 * the Tell Me command-search launcher on the right. Rendered for both the
 * bare and the composed document shell.
 */
export function ChromeStrip(props: ChromeStripProps): JSX.Element {
  const t = useI18n();
  return (
    <div class="oasis-chrome-strip" data-testid="editor-chrome-strip">
      <QuickAccessToolbar
        catalog={props.catalog}
        visible={props.visible}
        onToggle={props.onToggle}
        onExecute={props.onExecute}
        canExecute={props.canExecute}
        tick={props.tick}
      />
      <Text as="span" class="oasis-chrome-strip-spacer" aria-hidden="true" />
      <Button
        icon="search"
        label={t("toolbar.tellMe")}
        wide
        tooltip={`${t("toolbar.tellMe")} (Alt+Q)`}
        data-testid="editor-toolbar-tell-me"
        onClick={props.onOpenCommandSearch}
      />
    </div>
  );
}

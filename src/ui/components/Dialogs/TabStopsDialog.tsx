import { For, createEffect, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/public/Button.js";
import { Grid } from "@/ui/public/Grid.js";
import { NumberField } from "@/ui/public/NumberField.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { StatusText } from "@/ui/public/StatusText.js";
import { Dialog } from "./Dialog.js";
import type { EditorTabStop } from "@/core/model.js";

export interface TabStopsDialogProps {
  isOpen: boolean;
  initial: EditorTabStop[];
  onClose: () => void;
  onApply: (tabs: EditorTabStop[]) => void;
}

type TabType = EditorTabStop["type"];
type TabLeader = NonNullable<EditorTabStop["leader"]>;

interface DraftTabStop {
  position: number | null;
  type: TabType;
  leader: TabLeader;
}

function toDraft(stop: EditorTabStop): DraftTabStop {
  return {
    position: stop.position,
    type: stop.type,
    leader: stop.leader ?? "none",
  };
}

export function TabStopsDialog(props: TabStopsDialogProps): JSX.Element {
  const t = useI18n();
  const [stops, setStops] = createSignal<DraftTabStop[]>([]);

  createEffect((): void => {
    if (props.isOpen) {
      setStops(props.initial.map(toDraft));
    }
  });

  const updateStop = (index: number, patch: Partial<DraftTabStop>): void => {
    setStops((current) =>
      current.map(
        (stop, stopIndex): DraftTabStop =>
          stopIndex === index ? { ...stop, ...patch } : stop,
      ),
    );
  };

  const addStop = (): void => {
    setStops((current) => [
      ...current,
      { position: null, type: "left", leader: "none" },
    ]);
  };

  const removeStop = (index: number): void => {
    setStops((current) =>
      current.filter((_, stopIndex): boolean => stopIndex !== index),
    );
  };

  const handleApply = (): void => {
    const tabs: EditorTabStop[] = stops()
      .filter((stop): boolean => stop.position !== null)
      .map(
        (stop): EditorTabStop => ({
          position: stop.position as number,
          type: stop.type,
          ...(stop.leader !== "none" ? { leader: stop.leader } : {}),
        }),
      )
      .sort((a, b): number => a.position - b.position);
    props.onApply(tabs);
    props.onClose();
  };

  const typeOptions = (): { value: string; label: string }[] => [
    { value: "left", label: t("paragraph.tabAlignLeft") },
    { value: "center", label: t("paragraph.tabAlignCenter") },
    { value: "right", label: t("paragraph.tabAlignRight") },
    { value: "decimal", label: t("paragraph.tabAlignDecimal") },
    { value: "bar", label: t("paragraph.tabAlignBar") },
  ];

  const leaderOptions = (): { value: string; label: string }[] => [
    { value: "none", label: t("paragraph.tabLeaderNone") },
    { value: "dot", label: t("paragraph.tabLeaderDot") },
    { value: "hyphen", label: t("paragraph.tabLeaderHyphen") },
    { value: "underscore", label: t("paragraph.tabLeaderUnderscore") },
  ];

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("paragraph.tabsTitle")}
      onClose={props.onClose}
      footer={
        <div class="oasis-editor-dialog-footer-split">
          <div class="oasis-editor-dialog-footer-start">
            <Button
              variant="secondary"
              onClick={(): void => {
                setStops([]);
              }}
              data-testid="editor-tab-stops-clear"
            >
              {t("paragraph.tabsClearAll")}
            </Button>
          </div>
          <div class="oasis-editor-dialog-footer-end">
            <Button
              variant="secondary"
              onClick={props.onClose}
              data-testid="editor-tab-stops-cancel"
            >
              {t("generic.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              data-testid="editor-tab-stops-apply"
            >
              {t("generic.apply")}
            </Button>
          </div>
        </div>
      }
    >
      <div class="oasis-editor-tab-stops">
        <For
          each={stops()}
          fallback={
            <StatusText as="p" class="oasis-editor-dialog-help-text">
              {t("paragraph.tabsEmpty")}
            </StatusText>
          }
        >
          {(stop, index): JSX.Element => (
            <Grid container spacing={1.5} alignItems="flex-end">
              <Grid size={{ xs: 12, md: 4 }}>
                <NumberField
                  label={t("paragraph.tabsPosition")}
                  step="1"
                  value={stop.position ?? ""}
                  onChange={(value): void =>
                    updateStop(index(), { position: value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <SelectField
                  label={t("paragraph.tabsAlignment")}
                  value={stop.type}
                  onChange={(value): void =>
                    updateStop(index(), { type: value as TabType })
                  }
                  options={typeOptions()}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <SelectField
                  label={t("paragraph.tabsLeader")}
                  value={stop.leader}
                  onChange={(value): void =>
                    updateStop(index(), { leader: value as TabLeader })
                  }
                  options={leaderOptions()}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button
                  variant="ghost"
                  onClick={(): void => removeStop(index())}
                  data-testid="editor-tab-stops-remove"
                >
                  {t("paragraph.tabsRemove")}
                </Button>
              </Grid>
            </Grid>
          )}
        </For>
        <div class="oasis-editor-tab-stops-actions">
          <Button
            variant="secondary"
            icon="plus"
            onClick={addStop}
            data-testid="editor-tab-stops-add"
          >
            {t("paragraph.tabsAdd")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

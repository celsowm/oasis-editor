import { For, createEffect, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/public/Button.js";
import { NumberField } from "@/ui/public/NumberField.js";
import { RadioGroup } from "@/ui/public/Radio.js";
import { StatusText } from "@/ui/public/StatusText.js";
import { Dialog } from "./Dialog.js";
import type { EditorTabStop } from "@/core/model.js";
import { MAX_TAB_POSITION, MAX_TAB_STOPS, TAB_POS_EPS, type ParagraphTabStopsChange } from "@/core/commands/paragraphTabs.js";

export interface TabStopsDialogProps {
  isOpen: boolean;
  initial: EditorTabStop[];
  initialDefault?: number;
  selectedPosition?: number;
  onClose: () => void;
  onApply: (tabs: EditorTabStop[], changes: ParagraphTabStopsChange[]) => void;
}
type TabType = Exclude<EditorTabStop["type"], "clear">;
type TabLeader = NonNullable<EditorTabStop["leader"]>;
const same = (a: number, b: number): boolean => Math.abs(a - b) < TAB_POS_EPS;
const finitePosition = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && Math.abs(value) <= MAX_TAB_POSITION;

export function TabStopsDialog(props: TabStopsDialogProps): JSX.Element {
  const t = useI18n();
  const [stops, setStops] = createSignal<EditorTabStop[]>([]);
  const [changes, setChanges] = createSignal<ParagraphTabStopsChange[]>([]);
  const [position, setPosition] = createSignal<number | null>(null);
  const [type, setType] = createSignal<TabType>("left");
  const [leader, setLeader] = createSignal<TabLeader>("none");
  const [interval, setInterval] = createSignal<number | null>(36);
  const [initialInterval, setInitialInterval] = createSignal(36);
  const choose = (stop: EditorTabStop): void => {
    setPosition(stop.position);
    if (stop.type !== "clear") setType(stop.type);
    setLeader(stop.leader ?? "none");
  };
  createEffect((): void => {
    if (!props.isOpen) return;
    const initial = props.initial.filter(s => s.type !== "clear").map(s => ({...s})).sort((a,b) => a.position-b.position);
    setStops(initial);
    setChanges([]);
    const defaultValue = props.initialDefault ?? 36;
    setInterval(defaultValue);
    setInitialInterval(defaultValue);
    setPosition(null);
    setType("left");
    setLeader("none");
    const selected = initial.find(s => props.selectedPosition !== undefined && same(s.position, props.selectedPosition));
    if (selected) choose(selected);
  });
  const existing = (): EditorTabStop | undefined => stops().find(s => position() !== null && same(s.position, position()!));
  const validInterval = (): boolean => {
    const value = interval();
    return value !== null && Number.isFinite(value) && value >= 1 && value <= MAX_TAB_POSITION;
  };
  const canSet = (): boolean => finitePosition(position()) && (Boolean(existing()) || stops().length < MAX_TAB_STOPS);
  const setStop = (): void => {
    const pos = position();
    if (!finitePosition(pos) || !canSet()) return;
    const stop: EditorTabStop = {position: pos, type: type(), ...(type() !== "bar" && leader() !== "none" ? {leader: leader()} : {})};
    setStops(current => [...current.filter(s => !same(s.position,pos)),stop].sort((a,b)=>a.position-b.position));
    setChanges(current => [...current,{set:[stop]}]);
  };
  const clearStop = (): void => {
    const pos = position();
    if (!finitePosition(pos) || !existing()) return;
    setStops(current => current.filter(s => !same(s.position,pos)));
    setChanges(current => [...current,{clear:[pos]}]);
    setPosition(null);
  };
  const clearAll = (): void => {
    setStops([]);
    setPosition(null);
    setChanges(current => [...current,{clearAll:true}]);
  };
  const apply = (): void => {
    if (!validInterval()) return;
    const draft = [...changes()];
    if (interval() !== initialInterval()) draft.push({default:interval()});
    props.onApply(stops().map(s=>({...s})),draft);
    props.onClose();
  };
  const alignOptions = () => [
    {value:"left",label:t("paragraph.tabAlignLeft")},
    {value:"center",label:t("paragraph.tabAlignCenter")},
    {value:"right",label:t("paragraph.tabAlignRight")},
    {value:"decimal",label:t("paragraph.tabAlignDecimal")},
    {value:"bar",label:t("paragraph.tabAlignBar")},
  ];
  const leaderOptions = () => [
    {value:"none",label:t("paragraph.tabLeaderNone")},
    {value:"dot",label:"2  ............"},
    {value:"hyphen",label:"3  ----------"},
    {value:"underscore",label:"4  ________"},
    {value:"heavy",label:"5  ━━━━━━"},
    {value:"middleDot",label:"6  ············"},
  ];
  return <Dialog isOpen={props.isOpen} title={t("paragraph.tabsTitle")} onClose={props.onClose}
    testId="editor-tab-stops-dialog" class="oasis-editor-word-tabs-dialog"
    initialFocusTestId="editor-tab-stops-position"
    footer={<>
      <Button variant="secondary" onClick={props.onClose} data-testid="editor-tab-stops-cancel">{t("generic.cancel")}</Button>
      <Button variant="primary" disabled={!validInterval()} onClick={apply} data-testid="editor-tab-stops-apply">{t("generic.apply")}</Button>
    </>}>
    <div class="oasis-editor-word-tabs-fields">
      <div>
        <NumberField label={t("paragraph.tabsPosition")} step="0.05" min={-MAX_TAB_POSITION} max={MAX_TAB_POSITION}
          value={position() ?? ""} onChange={setPosition} data-testid="editor-tab-stops-position"
          error={position() !== null && !finitePosition(position()) ? t("paragraph.tabsInvalidPosition") : undefined} />
        <div class="oasis-editor-word-tabs-list" role="group" aria-label={t("paragraph.tabsDefined")}>
          <For each={stops()} fallback={<StatusText as="p">{t("paragraph.tabsEmpty")}</StatusText>}>
            {stop => <Button variant="ghost" class="oasis-editor-word-tabs-option"
              aria-pressed={position() !== null && same(position()!,stop.position)}
              onClick={()=>choose(stop)} data-testid="editor-tab-stops-option">
              {Number(stop.position.toFixed(2))} pt
            </Button>}
          </For>
        </div>
      </div>
      <NumberField label={t("paragraph.tabsDefaultInterval")} step="0.05" min="1" max={MAX_TAB_POSITION}
        value={interval() ?? ""} onChange={setInterval} data-testid="editor-tab-stops-default"
        error={!validInterval() ? t("paragraph.tabsInvalidInterval") : undefined} />
    </div>
    <div class="oasis-editor-word-tabs-fields">
      <RadioGroup label={t("paragraph.tabsAlignment")} value={type()} options={alignOptions()} onChange={v=>setType(v as TabType)} />
      <RadioGroup label={t("paragraph.tabsLeader")} value={type() === "bar" ? "none" : leader()} options={leaderOptions()}
        disabled={type() === "bar"} onChange={v=>setLeader(v as TabLeader)} />
    </div>
    <div class="oasis-editor-word-tabs-actions">
      <Button disabled={!canSet()} onClick={setStop} data-testid="editor-tab-stops-set">{t("paragraph.tabsSet")}</Button>
      <Button disabled={!existing()} onClick={clearStop} data-testid="editor-tab-stops-remove">{t("paragraph.tabsClear")}</Button>
      <Button onClick={clearAll} data-testid="editor-tab-stops-clear">{t("paragraph.tabsClearAll")}</Button>
    </div>
    <StatusText as="p">{t("paragraph.tabsDraftHelp")}</StatusText>
  </Dialog>;
}

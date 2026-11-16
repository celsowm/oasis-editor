import { For, Show, createSignal, createMemo, createEffect, createUniqueId, onCleanup, onMount, useContext, type JSX } from "solid-js";
import type { EditorWatermark } from "@/core/model.js";
import { PX_PER_POINT } from "@/core/units.js";
import { Dialog } from "@/ui/components/Dialogs/Dialog.js";
import { Button as DialogButton } from "@/ui/public/Button.js";
import { TextField } from "@/ui/public/TextField.js";
import { Button } from "./primitives/Button.js";
import { Select } from "./primitives/Select.js";
import { PopoverBranchContext } from "./primitives/popoverBranch.js";
import type { ToolbarActionApi } from "./schema/items.js";
import { parseDecimal } from "@/utils/parseNumber.js";

const PRESETS = [
  { id: "confidential", key: "design.watermarkConfidential", rotation: -45 },
  { id: "do-not-copy", key: "design.watermarkDoNotCopy", rotation: -45 },
  { id: "restricted", key: "design.watermarkRestricted", rotation: -45 },
  { id: "draft", key: "design.watermarkDraft", rotation: -45 },
  { id: "draft-horizontal", key: "design.watermarkDraft", rotation: 0 },
  { id: "sample", key: "design.watermarkSample", rotation: -45 },
] as const;

const defaults = (text: string, rotation = -45): EditorWatermark => ({
  kind: "text", text, rotation, color: "#94a3b8", opacity: 0.25,
  scale: 1, fontFamily: "Arial", fontSize: 48,
});
const samePreset = (current: EditorWatermark | null, preset: EditorWatermark): boolean =>
  current?.kind === "text" && current.text === preset.text &&
  (current.rotation ?? -45) === preset.rotation &&
  (current.color ?? "#94a3b8").toLowerCase() === preset.color &&
  (current.opacity ?? .25) === preset.opacity &&
  (current.fontFamily ?? "Arial") === preset.fontFamily &&
  (current.fontSize ?? 48) === preset.fontSize;

/** An illustrative sample page, using the renderer's text size, rotation and opacity. */
function WatermarkPreview(props: { value: EditorWatermark }): JSX.Element {
  const [imageSize, setImageSize] = createSignal({ width: 0, height: 0 });
  createEffect(() => {
    const src = props.value.kind === "image" ? props.value.src : undefined;
    setImageSize({width:0,height:0});
    if (!src) return;
    const img = new Image();
    img.onload = () => setImageSize({width:img.naturalWidth,height:img.naturalHeight});
    img.src = src;
    onCleanup(() => {img.onload = null;});
  });
  const scale = () => props.value.scale ?? 1;
  return (
    <svg class="oasis-editor-watermark-preview" viewBox="0 0 794 1123" aria-hidden="true">
      <rect width="794" height="1123" fill="#fff" />
      <rect x="100" y="105" width="260" height="12" rx="3" fill="#aab4bf" />
      <For each={Array.from({ length: 23 }, (_, i) => i)}>
        {i => <rect x="100" y={156 + i * 38} width={i % 6 === 5 ? 325 : 594} height="5" rx="2" fill="#dce1e6" />}
      </For>
      <g transform={`translate(397 561.5) rotate(${props.value.rotation ?? -45})`} opacity={props.value.opacity ?? .25}>
        <Show when={props.value.kind === "text"} fallback={
          <image href={props.value.src ?? ""} x={-imageSize().width * scale()/2}
            y={-imageSize().height * scale()/2} width={imageSize().width * scale()}
            height={imageSize().height * scale()} />
        }>
          <text text-anchor="middle" dominant-baseline="central"
            fill={props.value.color ?? "#94a3b8"} font-family={props.value.fontFamily ?? "Arial"}
            font-size={Math.max(8, (props.value.fontSize ?? 48) * PX_PER_POINT)}
            >{props.value.text}</text>
        </Show>
      </g>
    </svg>
  );
}

function WatermarkEditor(props: { api: ToolbarActionApi; initial: EditorWatermark; onCancel: () => void; onApply: (value: EditorWatermark) => void }): JSX.Element {
  const t = props.api.t;
  const [kind, setKind] = createSignal(props.initial.kind);
  const [text, setText] = createSignal(props.initial.text ?? t("design.watermarkConfidential"));
  const [src, setSrc] = createSignal(props.initial.src ?? "");
  const [color, setColor] = createSignal(props.initial.color ?? "#94a3b8");
  const [font, setFont] = createSignal(props.initial.fontFamily ?? "Arial");
  const [size, setSize] = createSignal(String(props.initial.fontSize ?? 48));
  const [transparency, setTransparency] = createSignal(String(Math.round((1-(props.initial.opacity ?? .25))*10000)/100));
  const [rotation, setRotation] = createSignal(String(props.initial.rotation ?? -45));
  const [scale, setScale] = createSignal(String(props.initial.scale ?? 1));
  const [loading, setLoading] = createSignal(false);
  const [imageError, setImageError] = createSignal(false);
  let reader: FileReader | undefined;
  let generation = 0;
  let root!: HTMLDivElement;
  const fontList = createUniqueId();
  const number = (raw: string, min: number, max: number): number | null => {
    const n = parseDecimal(raw);
    return n !== null && n >= min && n <= max ? n : null;
  };
  const draft = createMemo((): EditorWatermark => ({
    kind: kind(), ...(kind() === "text" ? { text: text(), fontFamily: font(), fontSize: number(size(), 8, 240) ?? 48 } : { src: src() }),
    color: color(), opacity: 1-(number(transparency(),0,100) ?? 75)/100,
    rotation: number(rotation(),-180,180) ?? -45, scale: number(scale(),.1,5) ?? 1,
  }));
  const valid = () => props.api.commands.state("setDocumentWatermark").isEnabled &&
    number(transparency(),0,100) !== null && number(rotation(),-180,180) !== null && number(scale(),.1,5) !== null &&
    (kind() === "text" ? !!text().trim() && !!font().trim() && number(size(),8,240) !== null : !!src() && !loading() && !imageError());
  const fileChanged = (event: Event): void => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const ticket = ++generation;
    reader?.abort();
    setImageError(false);
    if (!["image/png","image/jpeg","image/gif","image/svg+xml"].includes(file.type)) { setImageError(true); setLoading(false); return; }
    setLoading(true);
    reader = new FileReader();
    reader.onerror = () => { if (ticket === generation) { setLoading(false); setImageError(true); } };
    reader.onload = () => {
      const data = String(reader?.result ?? "");
      const image = new Image();
      image.onload = () => { if(ticket === generation) { setSrc(data); setLoading(false); } };
      image.onerror = () => { if(ticket === generation) { setLoading(false); setImageError(true); } };
      image.src = data;
    };
    reader.readAsDataURL(file);
  };
  onCleanup(() => { generation++; reader?.abort(); });
  onMount(() => root.querySelector<HTMLElement>("select, input")?.focus());
  const numeric = (label:string, id:string, value:()=>string, set:(value:string)=>void, min:number,max:number) => (
    <TextField label={label} aria-label={label} data-testid={id} type="text" inputMode="decimal" value={value()}
      aria-invalid={number(value(),min,max)===null ? "true":undefined} onChange={set} />
  );
  const keyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); props.onCancel(); }
    if (event.key !== "Tab") return;
    const nodes = [...root.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex='0']")].filter(el => el.getClientRects().length > 0);
    const first = nodes[0], last = nodes[nodes.length-1];
    if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return (
    <div ref={root} onClick={event => event.stopPropagation()} onKeyDown={keyDown}>
      <Dialog isOpen title={t("design.watermarkCustom")} onClose={props.onCancel} size="lg"
        class="oasis-editor-watermark-dialog" testId="editor-watermark-dialog" closeOnOverlayClick={false}
        footer={<><DialogButton variant="secondary" data-testid="editor-watermark-cancel" onClick={props.onCancel}>{t("generic.cancel")}</DialogButton>
          <DialogButton variant="primary" data-testid="editor-watermark-apply" disabled={!valid()} onClick={() => { if(valid()) props.onApply(draft()); }}>{t("generic.apply")}</DialogButton></>}>
        <div class="oasis-editor-watermark-editor">
          <div class="oasis-editor-watermark-fields">
            <label class="oasis-editor-watermark-field">{t("design.watermarkType")}
              <Select aria-label={t("design.watermarkType")} value={kind()} data-testid="editor-watermark-kind" onChange={e => setKind(e.currentTarget.value as EditorWatermark["kind"])}>
                <option value="text">{t("design.text")}</option><option value="image">{t("design.useImage")}</option>
              </Select>
            </label>
            <Show when={kind()==="text"} fallback={
              <div class="oasis-editor-watermark-field">
                <TextField label={t("design.useImage")} aria-label={t("design.useImage")} type="file" data-testid="editor-watermark-image" accept="image/png,image/jpeg,image/gif,image/svg+xml" onChange={() => undefined} onInput={fileChanged} />
                <Show when={loading()}><small role="status">{t("design.watermarkLoading")}</small></Show>
                <Show when={imageError()}><small role="alert">{t("design.watermarkImageError")}</small></Show>
              </div>
            }>
              <TextField label={t("design.text")} aria-label={t("design.text")} data-testid="editor-watermark-text" value={text()} onChange={setText}/>
              <TextField label={t("design.fontFamily")} aria-label={t("design.fontFamily")} value={font()} list={fontList} onChange={setFont}/>
              <datalist id={fontList}><For each={["Arial","Aptos","Calibri","Georgia","Times New Roman","Verdana"]}>{name=><option value={name}/>}</For></datalist>
              <div class="oasis-editor-watermark-field-pair">
                {numeric(t("design.fontSize"),"editor-watermark-font-size",size,setSize,8,240)}
                <TextField label={t("design.color")} aria-label={t("design.color")} type="color" value={color()} onChange={setColor}/>
              </div>
            </Show>
            {numeric(t("design.watermarkTransparency"),"editor-watermark-transparency",transparency,setTransparency,0,100)}
            <label class="oasis-editor-watermark-field">{t("design.rotation")}
              <Select aria-label={t("design.rotation")} value={rotation()==="0"?"0":rotation()==="-45"?"-45":"custom"} onChange={e=>setRotation(e.currentTarget.value==="custom"?"-30":e.currentTarget.value)}>
                <option value="-45">{t("design.watermarkDiagonal")}</option><option value="0">{t("design.watermarkHorizontal")}</option><option value="custom">{t("design.watermarkCustomAngle")}</option>
              </Select>
            </label>
            {numeric(t("design.rotation"),"editor-watermark-rotation",rotation,setRotation,-180,180)}
            {numeric(t("design.scale"),"editor-watermark-scale",scale,setScale,.1,5)}
          </div>
          <div class="oasis-editor-watermark-editor-preview">
            <span>{t("design.watermarkPreview")}</span><WatermarkPreview value={draft()}/>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export interface DesignWatermarkPanelProps { api: ToolbarActionApi; }
export function DesignWatermarkPanel(props: DesignWatermarkPanelProps): JSX.Element {
  const t = props.api.t;
  const branch = useContext(PopoverBranchContext);
  const current = (): EditorWatermark | null => (props.api.commands.state("setDocumentWatermark").value as EditorWatermark | null | undefined) ?? null;
  const editable = () => props.api.commands.state("setDocumentWatermark").isEnabled;
  const [editing,setEditing] = createSignal(false);
  let customButton: HTMLButtonElement | undefined;
  const closeEditor = () => { setEditing(false); queueMicrotask(() => customButton?.focus()); };
  const apply = (value: EditorWatermark | null) => {
    if(!editable()) return;
    props.api.commands.execute("setDocumentWatermark",value);
    setEditing(false);
    branch?.closeAll();
    props.api.focusEditor();
  };
  return (
    <div class="oasis-editor-watermark-gallery" data-testid="editor-watermark-gallery">
      <div inert={editing()}>
        <For each={[{ key: "design.watermarkConfidentiality", presets:PRESETS.slice(0,3) },{ key:"design.watermarkDrafts",presets:PRESETS.slice(3) }] as const}>
          {group => <section class="oasis-editor-watermark-section">
            <h3>{t(group.key)}</h3>
            <div class="oasis-editor-watermark-grid">
              <For each={group.presets}>{preset => {
                const value = () => defaults(t(preset.key),preset.rotation);
                const caption = () => preset.id==="draft-horizontal" ? `${t(preset.key)} · ${t("design.watermarkHorizontal")}` : t(preset.key);
                return <button type="button" class="oasis-editor-watermark-card" aria-pressed={samePreset(current(),value())}
                  disabled={!editable()} data-testid={`editor-watermark-preset-${preset.id}`} onClick={() => apply(value())}>
                  <WatermarkPreview value={value()}/><span>{caption()}</span>
                </button>;
              }}</For>
            </div>
          </section>}
        </For>
        <div class="oasis-editor-command-menu-section oasis-editor-watermark-actions">
          <Button ref={customButton} icon="settings-2" label={t("design.watermarkCustom")} disabled={!editable()}
            aria-haspopup="dialog" data-testid="editor-watermark-custom" onClick={event=>{event.stopPropagation();setEditing(true);}}/>
          <Button icon="eraser" label={t("design.watermarkRemove")} disabled={!editable()||!current()}
            data-testid="editor-watermark-remove" onClick={()=>apply(null)}/>
        </div>
      </div>
      <Show when={editing()}>
        <WatermarkEditor api={props.api} initial={current() ?? defaults(t("design.watermarkConfidential"))} onCancel={closeEditor} onApply={apply}/>
      </Show>
    </div>
  );
}

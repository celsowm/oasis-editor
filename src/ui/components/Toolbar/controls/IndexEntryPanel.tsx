import {createSignal,Show,useContext,type JSX} from "solid-js";
import {TextField} from "@/ui/public/TextField.js";
import {Button} from "@/ui/public/Button.js";
import {Checkbox} from "@/ui/public/Checkbox.js";
import {SelectField} from "@/ui/public/SelectField.js";
import {Text} from "@/ui/public/Text.js";
import {StatusText} from "@/ui/public/StatusText.js";
import {PopoverBranchContext} from "../primitives/popoverBranch.js";
import type {ToolbarActionApi} from "../schema/items.js";
import type {MarkIndexEntryOptions,InsertIndexOptions} from "@/core/commands/indexEntries.js";
import "./IndexEntryPanel.css";

export function IndexEntryPanel(props:{api:ToolbarActionApi;mode:"mark"|"insert"}):JSX.Element{
  const t=props.api.t,branch=useContext(PopoverBranchContext);
  const marking=()=>props.mode==="mark";
  const command=()=>marking()?"markIndexEntry":"insertIndex";
  const [main,setMain]=createSignal(""),[sub,setSub]=createSignal(""),[type,setType]=createSignal("");
  const [bold,setBold]=createSignal(false),[italic,setItalic]=createSignal(false);
  const [locale,setLocale]=createSignal(t("locale.id")==="en"?"en-US":"pt-BR");
  const [error,setError]=createSignal(false);
  const enabled=()=>props.api.commands.state(command()).isEnabled;
  const validLabel=(v:string)=>!!v.trim()&&v.trim().length<=1024&&!/[:;\\\u0000-\u001f\u007f]/.test(v);
  const valid=()=>enabled()&&(!type()||/^[A-Za-z]$/.test(type()))&&
    (!marking()||validLabel(main())&&(!sub().trim()||validLabel(sub())));
  function submit():void{
    if(!valid())return;
    const identifier=type()||undefined;
    const payload:MarkIndexEntryOptions|InsertIndexOptions=marking()
      ?{path:[main().trim(),...(sub().trim()?[sub().trim()]:[])],identifier,boldPage:bold(),italicPage:italic()}
      :{locale:locale(),identifier};
    if(!props.api.commands.canExecute(command(),payload)){setError(true);return;}
    const changed=props.api.commands.execute(command(),payload);
    if(changed!==true){setError(true);return;}
    branch?.closeAll();props.api.focusEditor();
  }
  return <form class="oasis-index-entry-panel" data-testid={marking()?"editor-index-mark-panel":"editor-index-insert-panel"}
    onClick={e=>e.stopPropagation()}
    onSubmit={e=>{e.preventDefault();e.stopPropagation();submit();}}>
    <Text as="p" size="sm">{t(marking()?"index.markHint":"index.insertHint")}</Text>
    <Show when={marking()} fallback={<SelectField label={t("index.locale")} data-testid="editor-index-locale" value={locale()}
      onChange={value=>{setLocale(value);setError(false);}}
      options={[{value:"pt-BR",label:"Português (Brasil)"},{value:"en-US",label:"English (US)"},
        {value:"pt-PT",label:"Português (Portugal)"},{value:"es-ES",label:"Español"}]}/>}>
      <TextField label={t("index.mainEntry")} value={main()} onChange={v=>{setMain(v);setError(false);}} data-testid="editor-index-main-entry"/>
      <TextField label={t("index.subentry")} value={sub()} onChange={v=>{setSub(v);setError(false);}} data-testid="editor-index-subentry"/>
      <Checkbox label={t("index.boldPage")} checked={bold()} onChange={setBold}/>
      <Checkbox label={t("index.italicPage")} checked={italic()} onChange={setItalic}/>
    </Show>
    <TextField label={t("index.identifier")} value={type()} maxlength={1}
      onChange={v=>{setType(v);setError(false);}} data-testid="editor-index-identifier"/>
    <Show when={error()}><StatusText as="p" tone="danger" role="alert">{t("index.refused")}</StatusText></Show>
    <div class="oasis-index-entry-actions">
      <Button onClick={()=>{branch?.closeAll();props.api.focusEditor();}}>{t("generic.cancel")}</Button>
      <Button type="submit" variant="primary" disabled={!valid()} data-testid="editor-index-confirm"
        onClick={e=>{e.preventDefault();e.stopPropagation();submit();}}>{t(marking()?"ribbon.markIndexEntry":"ribbon.insertIndex")}</Button>
    </div>
  </form>;
}

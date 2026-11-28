import { createSignal, Show, useContext, type JSX } from "solid-js";
import { TextField } from "@/ui/public/TextField.js";
import { Button } from "@/ui/public/Button.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { Text } from "@/ui/public/Text.js";
import { StatusText } from "@/ui/public/StatusText.js";
import { PopoverBranchContext } from "../primitives/popoverBranch.js";
import type { ToolbarActionApi } from "../schema/items.js";

export type FieldFamilyMode =
  | "insert-code"
  | "edit-code"
  | "authority"
  | "toa"
  | "tof"
  | "merge-preview"
  | "merge-all"
  | "form-value";

type MergeRecord = Readonly<Record<string, string>>;
const commandFor = (mode: FieldFamilyMode): string => {
  switch (mode) {
    case "insert-code":
      return "insertFieldCode";
    case "edit-code":
      return "editFieldCodeAtSelection";
    case "authority":
      return "markAuthorityEntry";
    case "toa":
      return "insertTableOfAuthorities";
    case "tof":
      return "insertTableOfFigures";
    case "merge-preview":
      return "previewMergeRecord";
    case "merge-all":
      return "mergeToNewDocuments";
    case "form-value":
      return "setFormFieldValue";
  }
};

/** Panels for field commands that require a payload. Keeps the core free of
 * dialogs: values are validated here and dispatched through the command bus. */
export function FieldFamilyPanel(props: {
  api: ToolbarActionApi;
  mode: FieldFamilyMode;
}): JSX.Element {
  const t = props.api.t,
    branch = useContext(PopoverBranchContext);
  const [code, setCode] = createSignal("");
  const [long, setLong] = createSignal(""),
    [short, setShort] = createSignal("");
  const [category, setCategory] = createSignal("1");
  const [locale, setLocale] = createSignal("pt-BR");
  const [heading, setHeading] = createSignal(false);
  const [unlabeled, setUnlabeled] = createSignal(false);
  const [identifier, setIdentifier] = createSignal("Figure");
  const [records, setRecords] = createSignal("[]");
  const [index, setIndex] = createSignal("0");
  const [name, setName] = createSignal(""),
    [value, setValue] = createSignal("");
  const [error, setError] = createSignal(false);
  const [parsed, setParsed] = createSignal<MergeRecord[] | undefined>(
    undefined,
  );
  const command = commandFor(props.mode);
  const enabled = () => props.api.commands.state(command).isEnabled;

  const parseRecords = (): MergeRecord[] | undefined => {
    try {
      const value = JSON.parse(records());
      if (
        !Array.isArray(value) ||
        value.length > 1000 ||
        value.some(
          (item) =>
            !item ||
            typeof item !== "object" ||
            Array.isArray(item) ||
            Object.values(item).some((v) => typeof v !== "string"),
        )
      )
        return undefined;
      return value as MergeRecord[];
    } catch {
      return undefined;
    }
  };
  const payload = (): unknown => {
    switch (props.mode) {
      case "insert-code":
      case "edit-code":
        return code().trim();
      case "authority":
        return {
          long: long().trim(),
          ...(short().trim() ? { short: short().trim() } : {}),
          category: category().trim() || "1",
        };
      case "toa":
        return {
          locale: locale(),
          category: category().trim() || "1",
          heading: heading(),
        };
      case "tof":
        return { identifier: identifier().trim(), unlabeled: unlabeled() };
      case "merge-preview":
        return { records: parsed(), index: Number(index()) };
      case "merge-all":
        return { records: parsed() };
      case "form-value":
        return { name: name().trim(), value: value() };
    }
  };
  const valid = (): boolean => {
    if (!enabled()) return false;
    switch (props.mode) {
      case "insert-code":
      case "edit-code":
        return code().trim().length > 0 && code().length <= 4096;
      case "authority":
        return !!long().trim() && long().length <= 4096;
      case "toa":
        return (
          !!category().trim() && /^[A-Za-z0-9]{1,32}$/.test(category().trim())
        );
      case "tof":
        return /^[A-Za-z_][A-Za-z0-9_ ]{0,63}$/.test(identifier().trim());
      case "merge-preview": {
        const list = parsed();
        return (
          !!list &&
          Number.isInteger(Number(index())) &&
          Number(index()) >= 0 &&
          Number(index()) < list.length
        );
      }
      case "merge-all":
        return !!parsed();
      case "form-value":
        return !!name().trim();
    }
  };
  function submit(): void {
    setParsed(parseRecords());
    if (!valid() || !props.api.commands.canExecute(command, payload())) {
      setError(true);
      return;
    }
    const changed = props.api.commands.execute(command, payload());
    if (changed !== true && props.mode !== "merge-all") {
      setError(true);
      return;
    }
    branch?.closeAll();
    props.api.focusEditor();
  }
  const title = (): string =>
    t(
      props.mode === "toa"
        ? "ribbon.insertTableOfAuthorities"
        : props.mode === "tof"
          ? "ribbon.insertTableOfFigures"
          : props.mode === "authority"
            ? "ribbon.markAuthorityEntry"
            : props.mode === "form-value"
              ? "ribbon.setFormFieldValue"
              : props.mode === "merge-all"
                ? "ribbon.mergeToNewDocuments"
                : props.mode === "merge-preview"
                  ? "ribbon.previewMergeRecord"
                  : props.mode === "edit-code"
                    ? "ribbon.editFieldCode"
                    : "ribbon.insertFieldCode",
    );
  return (
    <form
      class="oasis-index-entry-panel"
      data-testid={`editor-field-panel-${props.mode}`}
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        submit();
      }}
    >
      <Text as="p" size="sm">
        {title()}
      </Text>
      <Show when={props.mode === "insert-code" || props.mode === "edit-code"}>
        <TextField
          label={t("field.panel.code")}
          value={code()}
          onChange={(v) => {
            setCode(v);
            setError(false);
          }}
          data-testid="editor-field-code"
        />
      </Show>
      <Show when={props.mode === "authority"}>
        <TextField
          label={t("index.mainEntry")}
          value={long()}
          onChange={(v) => {
            setLong(v);
            setError(false);
          }}
          data-testid="editor-authority-long"
        />
        <TextField
          label={t("index.subentry")}
          value={short()}
          onChange={(v) => {
            setShort(v);
            setError(false);
          }}
          data-testid="editor-authority-short"
        />
        <TextField
          label={t("field.panel.category")}
          value={category()}
          onChange={setCategory}
          data-testid="editor-authority-category"
        />
      </Show>
      <Show when={props.mode === "toa"}>
        <SelectField
          label={t("index.locale")}
          value={locale()}
          onChange={(value) => {
            setLocale(value);
            setError(false);
          }}
          options={[
            { value: "pt-BR", label: "Português (Brasil)" },
            { value: "en-US", label: "English (US)" },
          ]}
        />
        <TextField
          label={t("field.panel.category")}
          value={category()}
          onChange={setCategory}
          data-testid="editor-toa-category"
        />
        <Checkbox
          label={t("ribbon.updateTableOfAuthorities")}
          checked={heading()}
          onChange={setHeading}
        />
      </Show>
      <Show when={props.mode === "tof"}>
        <TextField
          label={t("field.panel.identifier")}
          value={identifier()}
          onChange={(v) => {
            setIdentifier(v);
            setError(false);
          }}
          data-testid="editor-tof-identifier"
        />
        <Checkbox
          label={t("ribbon.updateTableOfFigures")}
          checked={unlabeled()}
          onChange={setUnlabeled}
        />
      </Show>
      <Show when={props.mode === "merge-preview" || props.mode === "merge-all"}>
        <TextField
          label={t("field.panel.records")}
          value={records()}
          onChange={(v) => {
            setRecords(v);
            setParsed(parseRecords());
            setError(false);
          }}
          data-testid="editor-merge-records"
        />
        <Show when={props.mode === "merge-preview"}>
          <TextField
            label={t("field.panel.index")}
            value={index()}
            onChange={(v) => {
              setIndex(v);
              setError(false);
            }}
            data-testid="editor-merge-index"
          />
        </Show>
      </Show>
      <Show when={props.mode === "form-value"}>
        <TextField
          label={t("field.panel.name")}
          value={name()}
          onChange={(v) => {
            setName(v);
            setError(false);
          }}
          data-testid="editor-form-name"
        />
        <TextField
          label={t("field.panel.value")}
          value={value()}
          onChange={(v) => {
            setValue(v);
            setError(false);
          }}
          data-testid="editor-form-value"
        />
      </Show>
      <Show when={error()}>
        <StatusText as="p" tone="danger" role="alert">
          {t("field.panel.refused")}
        </StatusText>
      </Show>
      <div class="oasis-index-entry-actions">
        <Button
          onClick={() => {
            branch?.closeAll();
            props.api.focusEditor();
          }}
        >
          {t("generic.cancel")}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!valid()}
          data-testid={`editor-field-confirm-${props.mode}`}
        >
          {title()}
        </Button>
      </div>
    </form>
  );
}

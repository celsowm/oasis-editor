import {
  For,
  Show,
  createContext,
  createUniqueId,
  splitProps,
  useContext,
  type JSX,
} from "solid-js";

interface RadioGroupContext {
  name: string;
  value: () => string | undefined;
  onSelect: (value: string) => void;
  disabled: () => boolean;
}

const RadioGroupCtx = createContext<RadioGroupContext>();

export interface RadioProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "value"
> {
  label: string;
  description?: string;
  value: string;
  onChange?: (checked: boolean) => void;
}

/**
 * A single radio button. Reuses the checkbox visual language. Inside a
 * `RadioGroup` it derives `name`/`checked`/disabled from context; standalone it
 * behaves like a controlled radio driven by its own props.
 */
export function Radio(props: RadioProps): JSX.Element {
  const fallbackId = createUniqueId();
  const group = useContext(RadioGroupCtx);
  const [local, others] = splitProps(props, [
    "label",
    "description",
    "value",
    "onChange",
    "class",
    "id",
    "checked",
    "name",
    "disabled",
  ]);
  const id = (): string => local.id ?? fallbackId;
  const descriptionId = (): string => `${id()}-description`;
  const checked = (): boolean =>
    group ? group.value() === local.value : Boolean(local.checked);
  const disabled = (): boolean =>
    Boolean(local.disabled) || (group ? group.disabled() : false);

  return (
    <label class={`oasis-editor-ui-radio ${local.class ?? ""}`} for={id()}>
      <input
        id={id()}
        type="radio"
        class="oasis-editor-ui-radio-input"
        name={local.name ?? group?.name}
        value={local.value}
        checked={checked()}
        disabled={disabled()}
        aria-describedby={local.description ? descriptionId() : undefined}
        onChange={(event): void => {
          if (group) group.onSelect(local.value);
          local.onChange?.(event.currentTarget.checked);
        }}
        {...others}
      />
      <span class="oasis-editor-ui-checkbox-copy">
        <span class="oasis-editor-ui-field-label">{local.label}</span>
        <Show when={local.description}>
          <span id={descriptionId()} class="oasis-editor-ui-field-description">
            {local.description}
          </span>
        </Show>
      </span>
    </label>
  );
}

export interface RadioGroupOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Shared `name` for the radios; auto-generated when omitted. */
  name?: string;
  label?: string;
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  /** Declarative options. Omit to provide `Radio` children directly. */
  options?: RadioGroupOption[];
  class?: string;
  children?: JSX.Element;
}

/**
 * Groups radios under one `name` and owns the selected value, mirroring the
 * controller-style API of `SelectField`. Pass `options` for the common case or
 * `Radio` children for custom layout.
 */
export function RadioGroup(props: RadioGroupProps): JSX.Element {
  const fallbackName = createUniqueId();
  const ctx: RadioGroupContext = {
    name: props.name ?? fallbackName,
    value: (): string | undefined => props.value,
    onSelect: (value): void | undefined => props.onChange?.(value),
    disabled: (): boolean => Boolean(props.disabled),
  };

  return (
    <RadioGroupCtx.Provider value={ctx}>
      <div
        class={`oasis-editor-ui-radio-group ${props.class ?? ""}`}
        role="radiogroup"
        aria-label={props.label}
      >
        <Show when={props.label}>
          <span class="oasis-editor-ui-field-label">{props.label}</span>
        </Show>
        <Show when={props.options} fallback={props.children}>
          <For each={props.options}>
            {(option): JSX.Element => (
              <Radio
                value={option.value}
                label={option.label}
                description={option.description}
                disabled={option.disabled}
              />
            )}
          </For>
        </Show>
      </div>
    </RadioGroupCtx.Provider>
  );
}

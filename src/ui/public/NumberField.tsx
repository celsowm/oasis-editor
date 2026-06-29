import { splitProps, type JSX } from "solid-js";
import { TextField, type TextFieldProps } from "./TextField.js";

export interface NumberFieldProps extends Omit<
  TextFieldProps,
  "type" | "onChange"
> {
  /** Called with the parsed number, or `null` when the field is empty/invalid. */
  onChange?: (value: number | null) => void;
}

/**
 * `TextField` specialised for numeric input. Wraps the raw string from the DOM
 * in a parse so consumers receive `number | null` instead of repeating
 * `Number(event.currentTarget.value)` at every call site.
 */
export function NumberField(props: NumberFieldProps): JSX.Element {
  const [local, others] = splitProps(props, ["onChange"]);
  return (
    <TextField
      type="number"
      onChange={(raw) => {
        if (raw.trim() === "") {
          local.onChange?.(null);
          return;
        }
        const parsed = Number(raw);
        local.onChange?.(Number.isNaN(parsed) ? null : parsed);
      }}
      {...others}
    />
  );
}

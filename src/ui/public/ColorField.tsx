import { splitProps, type JSX } from "solid-js";
import { TextField, type TextFieldProps } from "./TextField.js";

export interface ColorFieldProps extends Omit<
  TextFieldProps,
  "type" | "onChange"
> {
  onChange?: (value: string) => void;
}

export function ColorField(props: ColorFieldProps): JSX.Element {
  const [local, others] = splitProps(props, ["controlClass", "onChange"]);
  return (
    <TextField
      type="color"
      controlClass={`oasis-editor-ui-color-input ${local.controlClass ?? ""}`}
      onChange={local.onChange}
      {...others}
    />
  );
}

import type { JSX } from "solid-js";
import { TextField } from "@/ui/public/TextField.js";

/**
 * Numeric field used across the table-properties panels. Thin composition over
 * the public `TextField` (theme-aware) that keeps the grow layout and the
 * string-based store contract, replacing the dialog's old hand-rolled
 * `numericInput` helper.
 */
export function NumField(
  label: string,
  value: () => string,
  setter: (value: string) => void,
  testId: string,
  disabled = false,
  allowNegative = false,
): JSX.Element {
  return (
    <TextField
      class="oasis-editor-dialog-input-group-grow"
      type="number"
      label={label}
      min={allowNegative ? undefined : "0"}
      step="1"
      value={value()}
      disabled={disabled}
      onChange={setter}
      data-testid={testId}
    />
  );
}

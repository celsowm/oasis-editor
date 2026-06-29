import { createEffect } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { TablePropertiesController } from "./TablePropertiesController.js";
import {
  buildTableApplyValues,
  createDefaultFormState,
  formStateFromInitial,
  type TableFormState,
  type TablePropertiesDialogProps,
} from "./TablePropertiesTypes.js";

export function useTablePropertiesController(
  props: TablePropertiesDialogProps,
): TablePropertiesController {
  const [form, setForm] = createStore<TableFormState>(createDefaultFormState());

  createEffect((): void => {
    if (!props.isOpen) return;
    setForm(reconcile(formStateFromInitial(props.initial)));
  });

  const handleApply = (): void => {
    props.onApply(buildTableApplyValues(form), props.initial);
    props.onClose();
  };

  return { form, set: setForm, handleApply };
}

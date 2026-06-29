import type { SetStoreFunction } from "solid-js/store";
import type { TableFormState } from "./TablePropertiesTypes.js";

/**
 * View-facing contract for the Table Properties dialog. Panels depend on this
 * interface (not the hook implementation), mirroring `FontDialogController`.
 */
export interface TablePropertiesController {
  form: TableFormState;
  set: SetStoreFunction<TableFormState>;
  handleApply: () => void;
}

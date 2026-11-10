import { createSignal, type Signal } from "solid-js";

// Editing and resize rebuild controls. Keep user choices with this toolbar's
// API owner, outside document/history state and without sharing across editors.
const choices = new WeakMap<object, Map<string, Signal<string>>>();

export function toolbarChoice(
  owner: object,
  key: string,
  initial: string,
): Signal<string> {
  let values = choices.get(owner);
  if (!values) {
    values = new Map();
    choices.set(owner, values);
  }
  let value = values.get(key);
  if (!value) {
    value = createSignal(initial);
    values.set(key, value);
  }
  return value;
}

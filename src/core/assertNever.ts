/**
 * Exhaustiveness guard for discriminated-union dispatch. Put a call to this in
 * the `default` arm of a `switch` over a union (e.g. `EditorBlockNode.type`):
 * if a new variant is added, every visitor that forgot to handle it becomes a
 * compile error here instead of silently falling through and dropping data.
 *
 * This is intentionally a tiny local helper, not a global visitor registry —
 * each pipeline keeps its own dispatch but gains compile-time exhaustiveness
 * (O2).
 */
export function assertNever(value: never, label = "value"): never {
  const tag =
    value && typeof value === "object" && "type" in value
      ? (value as { type: unknown }).type
      : value;
  throw new Error(`Unhandled ${label}: ${String(tag)}`);
}

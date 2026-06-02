export type CommandRef<Name extends string = string, Payload = unknown> =
  | Name
  | {
      name: Name;
      payload?: Payload;
    };

export interface ResolvedCommandRef {
  name: string;
  payload: unknown;
}

export function commandRefName(ref: CommandRef): string {
  return typeof ref === "string" ? ref : ref.name;
}

export function resolveCommandRef(
  ref: CommandRef,
  payloadOverride?: unknown,
): ResolvedCommandRef {
  if (typeof ref === "string") {
    return { name: ref, payload: payloadOverride };
  }
  return {
    name: ref.name,
    payload: payloadOverride !== undefined ? payloadOverride : ref.payload,
  };
}

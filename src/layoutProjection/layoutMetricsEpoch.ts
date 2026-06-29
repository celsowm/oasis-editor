import { createSignal } from "solid-js";

const [layoutMetricsEpochValue, setLayoutMetricsEpochValue] = createSignal(0);

export function layoutMetricsEpoch(): number {
  return layoutMetricsEpochValue();
}

export function bumpLayoutMetricsEpoch(): void {
  setLayoutMetricsEpochValue((current): number => current + 1);
}

import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { LayoutFragment, LineInfo } from "../../core/layout/LayoutFragment.js";
import { measureLineWidthUpToOffset } from "./JustifiedLineMeasurer.js";

export class TextMeasurementService {
  constructor(private measurer: TextMeasurer) {}

  public measureWidthUpToOffset(
    fragment: LayoutFragment,
    line: LineInfo,
    endOffset: number,
  ): number {
    return measureLineWidthUpToOffset(fragment, line, endOffset, this.measurer);
  }
}

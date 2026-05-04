import {
  MeasureTextInput,
  MeasureTextResult,
  TextMeasurer,
} from "./TextMeasurementBridge.js";

export class BrowserTextMeasurer implements TextMeasurer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d")!;
  }

  measureText(input: MeasureTextInput): MeasureTextResult {
    const weight = input.fontWeight ?? 400;
    const style = input.fontStyle ?? "normal";
    this.context.font = `${style} ${weight} ${input.fontSize}px ${input.fontFamily}`;
    const metrics = this.context.measureText(input.text);

    return {
      width: metrics.width,
      height: input.fontSize * 1.4,
    };
  }
}

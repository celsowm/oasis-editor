import {
  MeasureTextInput,
  MeasureTextResult,
  TextMeasurer,
} from "./TextMeasurementBridge.js";

export class BrowserTextMeasurer implements TextMeasurer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private cache: Map<string, MeasureTextResult>;
  private lastFont: string = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d")!;
    this.cache = new Map();
  }

  measureText(input: MeasureTextInput): MeasureTextResult {
    const weight = input.fontWeight ?? 400;
    const style = input.fontStyle ?? "normal";
    const font = `${style} ${weight} ${input.fontSize}px ${input.fontFamily}`;

    const cacheKey = `${font}|${input.text}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (this.lastFont !== font) {
      this.context.font = font;
      this.lastFont = font;
    }

    const metrics = this.context.measureText(input.text);
    const result = {
      width: metrics.width,
      height: input.fontSize * 1.4,
    };

    // Simple cache eviction to prevent memory bloat
    if (this.cache.size > 10000) {
      this.cache.clear();
    }

    this.cache.set(cacheKey, result);
    return result;
  }
}

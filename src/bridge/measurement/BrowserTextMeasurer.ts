// @ts-nocheck








export class BrowserTextMeasurer {








  constructor() {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
  }

  measureText(input) {
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

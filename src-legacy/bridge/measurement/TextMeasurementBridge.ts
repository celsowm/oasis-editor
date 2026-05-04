export interface MeasureTextInput {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  fontStyle?: string;
}

export interface MeasureTextResult {
  width: number;
  height: number;
}

export interface TextMeasurer {
  measureText(input: MeasureTextInput): MeasureTextResult;
}

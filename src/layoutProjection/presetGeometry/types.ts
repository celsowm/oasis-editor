export type PresetPathSegment =
  | { type: "move"; x: number; y: number }
  | { type: "line"; x: number; y: number }
  | {
      type: "cubic";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { type: "close" };

export type PresetSegmentResolver = (
  preset: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => PresetPathSegment[];

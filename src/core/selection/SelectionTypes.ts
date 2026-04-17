export interface LogicalPosition {
  sectionId: string;
  blockId: string;
  inlineId: string;
  offset: number;
}

export interface LogicalRange {
  start: LogicalPosition;
  end: LogicalPosition;
}

export interface EditorSelection {
  anchor: LogicalPosition;
  focus: LogicalPosition;
}

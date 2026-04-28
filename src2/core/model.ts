export interface Editor2Block {
  id: string;
  text: string;
}

export interface Editor2Position {
  blockId: string;
  offset: number;
}

export interface Editor2Selection {
  anchor: Editor2Position;
  focus: Editor2Position;
}

export interface Editor2State {
  blocks: Editor2Block[];
  selection: Editor2Selection;
}

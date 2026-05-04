export interface InputBox {
  left: number;
  top: number;
  height: number;
}

export interface CaretBox extends InputBox {
  visible: boolean;
}

export interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RevisionBox {
  revisionId: string;
  author: string;
  date: number;
  type: "insert" | "delete";
  left: number;
  top: number;
}

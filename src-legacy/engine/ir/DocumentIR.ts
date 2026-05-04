import { BlockNode, ListFormat } from "../../core/document/BlockTypes.js";

export interface DocumentIR {
  metadata: {
    title?: string;
    creator?: string;
    createdAt?: Date;
    modifiedAt?: Date;
  };
  body: BlockNode[];
  header?: BlockNode[];
  footer?: BlockNode[];
  styles: StyleRegistry;
  numbering: NumberingRegistry;
  assets: AssetRegistry;
  notes: NotesRegistry;
  comments: CommentRegistry;
  warnings: ConversionWarning[];
}

export interface ConversionWarning {
  code: string;
  message: string;
  partName?: string;
  xmlPath?: string;
  severity: "info" | "warning" | "error";
}

export interface StyleEntry {
  styleId: string;
  type: "paragraph" | "character" | "table" | "numbering";
  name?: string;
  basedOn?: string;
  next?: string;
  isDefault?: boolean;
  qFormat?: boolean;
  paragraphProps?: Record<string, unknown>;
  runProps?: Record<string, unknown>;
}

export class StyleRegistry {
  private styles = new Map<string, StyleEntry>();

  add(style: StyleEntry): void {
    this.styles.set(style.styleId, style);
  }

  get(styleId: string): StyleEntry | undefined {
    return this.styles.get(styleId);
  }

  getDefault(type: StyleEntry["type"]): StyleEntry | undefined {
    return Array.from(this.styles.values()).find(
      (s) => s.type === type && s.isDefault,
    );
  }

  resolveChain(styleId: string): StyleEntry[] {
    const chain: StyleEntry[] = [];
    const visited = new Set<string>();
    let current = this.styles.get(styleId);
    while (current && !visited.has(current.styleId)) {
      visited.add(current.styleId);
      chain.push(current);
      current = current.basedOn ? this.styles.get(current.basedOn) : undefined;
    }
    return chain;
  }

  values(): IterableIterator<StyleEntry> {
    return this.styles.values();
  }
}

export interface NumberingLevel {
  level: number;
  format?: ListFormat;
  text?: string;
  start?: number;
  paragraphProps?: Record<string, unknown>;
  runProps?: Record<string, unknown>;
}

export interface AbstractNum {
  abstractNumId: string;
  levels: NumberingLevel[];
}

export interface ConcreteNum {
  numId: string;
  abstractNumId: string;
}

export class NumberingRegistry {
  private abstractNums = new Map<string, AbstractNum>();
  private nums = new Map<string, ConcreteNum>();

  addAbstract(abstractNum: AbstractNum): void {
    this.abstractNums.set(abstractNum.abstractNumId, abstractNum);
  }

  addConcrete(num: ConcreteNum): void {
    this.nums.set(num.numId, num);
  }

  getConcrete(numId: string): ConcreteNum | undefined {
    return this.nums.get(numId);
  }

  getAbstract(abstractNumId: string): AbstractNum | undefined {
    return this.abstractNums.get(abstractNumId);
  }

  resolveLevel(numId: string, ilvl: number): NumberingLevel | undefined {
    const concrete = this.nums.get(numId);
    if (!concrete) return undefined;
    const abstract = this.abstractNums.get(concrete.abstractNumId);
    if (!abstract) return undefined;
    return abstract.levels.find((l) => l.level === ilvl);
  }
}

export interface AssetEntry {
  id: string;
  partName: string;
  contentType: string;
  data: Uint8Array;
}

export class AssetRegistry {
  private assets = new Map<string, AssetEntry>();

  add(asset: AssetEntry): void {
    this.assets.set(asset.id, asset);
  }

  get(id: string): AssetEntry | undefined {
    return this.assets.get(id);
  }

  values(): IterableIterator<AssetEntry> {
    return this.assets.values();
  }
}

export interface NoteEntry {
  id: string;
  type: "footnote" | "endnote";
  blocks: BlockNode[];
}

export class NotesRegistry {
  private notes = new Map<string, NoteEntry>();

  add(note: NoteEntry): void {
    this.notes.set(note.id, note);
  }

  get(id: string): NoteEntry | undefined {
    return this.notes.get(id);
  }

  getByType(type: NoteEntry["type"]): NoteEntry[] {
    return Array.from(this.notes.values()).filter((n) => n.type === type);
  }
}

export interface CommentEntry {
  id: string;
  author?: string;
  date?: Date;
  blocks: BlockNode[];
}

export class CommentRegistry {
  private comments = new Map<string, CommentEntry>();

  add(comment: CommentEntry): void {
    this.comments.set(comment.id, comment);
  }

  get(id: string): CommentEntry | undefined {
    return this.comments.get(id);
  }

  values(): IterableIterator<CommentEntry> {
    return this.comments.values();
  }
}

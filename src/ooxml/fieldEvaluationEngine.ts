export interface FieldInstructionAst {
  name: string;
  args: string[];
  switches: Record<string, string | true>;
}

export interface FieldEvaluationContext {
  pageNumber?: number;
  totalPages?: number;
  docVariables?: Record<string, string>;
  docProperties?: Record<string, string>;
  bookmarks?: Record<string, { pageNumber?: number; text?: string }>;
  headings?: Array<{ level: number; text: string; pageNumber?: number }>;
  currentDate?: Date;
}

export function parseFieldInstruction(instruction: string): FieldInstructionAst {
  const trimmed = instruction.trim();
  const tokens: string[] = [];
  let currentToken = "";
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]!;
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === " " && !inQuotes) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = "";
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken) {
    tokens.push(currentToken);
  }

  const name = (tokens[0] ?? "").toUpperCase();
  const args: string[] = [];
  const switches: Record<string, string | true> = {};

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.startsWith("\\")) {
      const switchKey = token.slice(1);
      const nextToken = tokens[i + 1];
      if (nextToken && !nextToken.startsWith("\\")) {
        switches[switchKey] = nextToken;
        i++;
      } else {
        switches[switchKey] = true;
      }
    } else {
      args.push(token);
    }
  }

  return { name, args, switches };
}

export function evaluateFieldInstruction(
  instruction: string,
  context: FieldEvaluationContext = {}
): string {
  const ast = parseFieldInstruction(instruction);

  switch (ast.name) {
    case "PAGE":
      return String(context.pageNumber ?? 1);
    case "NUMPAGES":
      return String(context.totalPages ?? 1);
    case "DOCVARIABLE":
      return context.docVariables?.[ast.args[0] ?? ""] ?? "";
    case "DOCPROPERTY":
      return context.docProperties?.[ast.args[0] ?? ""] ?? "";
    case "REF": {
      const bmName = ast.args[0] ?? "";
      return context.bookmarks?.[bmName]?.text ?? `[Unresolved REF: ${bmName}]`;
    }
    case "PAGEREF": {
      const bmName = ast.args[0] ?? "";
      return String(context.bookmarks?.[bmName]?.pageNumber ?? 1);
    }
    case "DATE": {
      const now = context.currentDate ?? new Date();
      return now.toLocaleDateString("en-US");
    }
    case "TIME": {
      const now = context.currentDate ?? new Date();
      return now.toLocaleTimeString("en-US");
    }
    case "IF": {
      const expr1 = ast.args[0] ?? "";
      const op = ast.args[1] ?? "=";
      const expr2 = ast.args[2] ?? "";
      const trueResult = ast.args[3] ?? "";
      const falseResult = ast.args[4] ?? "";

      let isTrue = false;
      if (op === "=" || op === "==") isTrue = expr1 === expr2;
      else if (op === "!=") isTrue = expr1 !== expr2;

      return isTrue ? trueResult : falseResult;
    }
    default:
      return `[Field: ${ast.name}]`;
  }
}

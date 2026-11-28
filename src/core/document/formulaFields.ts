/** Bounded arithmetic evaluator for `= (Formula)` fields. Hand-written
 * recursive descent: no eval, no Function, no cell references, no table
 * access, and a hard limit on tokens, nesting and numeric magnitude. */
export type FormulaValue = number | boolean;
export interface FormulaContext {
  variables?: Readonly<Record<string, string>>;
  record?: Readonly<Record<string, string>>;
}
type Token = {
  kind: "number" | "identifier" | "operator" | "paren" | "comma";
  value: string;
};
const maxTokens = 256;
const maxDepth = 32;

function tokenize(raw: string): Token[] | undefined {
  const tokens: Token[] = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (tokens.length >= maxTokens) return undefined;
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < raw.length && /[0-9.]/.test(raw[j]!)) j++;
      const value = raw.slice(i, j);
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return undefined;
      tokens.push({ kind: "number", value });
      i = j;
      continue;
    }
    if (/[\p{L}_]/u.test(ch)) {
      let j = i;
      while (j < raw.length && /[\p{L}\p{N}_.]/u.test(raw[j]!)) j++;
      tokens.push({ kind: "identifier", value: raw.slice(i, j) });
      i = j;
      continue;
    }
    if ("()".includes(ch)) {
      tokens.push({ kind: "paren", value: ch });
      i++;
      continue;
    }
    if (ch === "," || ch === ";") {
      tokens.push({ kind: "comma", value: ch });
      i++;
      continue;
    }
    const two = raw.slice(i, i + 2);
    if (["<=", ">=", "<>"].includes(two)) {
      tokens.push({ kind: "operator", value: two });
      i += 2;
      continue;
    }
    if (["+", "-", "*", "/", "%", "^", "=", "<", ">"].includes(ch)) {
      tokens.push({ kind: "operator", value: ch });
      i++;
      continue;
    }
    return undefined;
  }
  return tokens.length ? tokens : undefined;
}

const functions: Readonly<Record<string, number>> = {
  ABS: 1,
  INT: 1,
  ROUND: 2,
  SIGN: 1,
  MOD: 2,
  MIN: -1,
  MAX: -1,
  SUM: -1,
  PRODUCT: -1,
  AVERAGE: -1,
  COUNT: -1,
  AND: -1,
  OR: -1,
  NOT: 1,
  TRUE: 0,
  FALSE: 0,
  DEFINED: 1,
};
const finite = (value: FormulaValue | undefined): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= 1e12;

/** Evaluate a bounded Word formula; undefined means "preserve cached result". */
export function evaluateFormula(
  raw: string,
  context: FormulaContext = {},
  depth = 0,
): FormulaValue | undefined {
  if (depth > maxDepth || typeof raw !== "string") return undefined;
  const tokens = tokenize(raw);
  if (!tokens) return undefined;
  let position = 0;
  const peek = (): Token | undefined => tokens[position];
  const take = (): Token | undefined => tokens[position++];
  const resolve = (name: string): FormulaValue | undefined => {
    const key = name.toLowerCase();
    const value =
      context.variables?.[key] ??
      context.variables?.[name] ??
      context.record?.[name];
    if (value === undefined) return undefined;
    if (value === "TRUE" || value === "true") return true;
    if (value === "FALSE" || value === "false") return false;
    return finite(Number(value)) ? Number(value) : undefined;
  };
  const number = (value: FormulaValue | undefined): number | undefined =>
    typeof value === "boolean"
      ? value
        ? 1
        : 0
      : finite(value)
        ? value
        : undefined;

  const primary = (): FormulaValue | undefined => {
    const token = take();
    if (!token) return undefined;
    if (token.kind === "number") return Number(token.value);
    if (token.kind === "paren") {
      const value = comparison();
      return peek()?.kind === "paren" && peek()?.value === ")"
        ? (take(), value)
        : undefined;
    }
    if (token.kind !== "identifier") return undefined;
    const name = token.value.toUpperCase();
    if (peek()?.kind !== "paren" || peek()?.value !== "(")
      return resolve(token.value);
    if (!(name in functions)) return undefined;
    take();
    const firstArgRaw = peek()?.value;
    const args: FormulaValue[] = [];
    if (peek()?.value === ")") take();
    else {
      for (;;) {
        const arg = comparison();
        if (arg === undefined) return undefined;
        args.push(arg);
        const next = peek();
        if (next?.kind === "comma") {
          take();
          continue;
        }
        if (next?.kind === "paren" && next.value === ")") {
          take();
          break;
        }
        return undefined;
      }
    }
    const arity = functions[name]!;
    if (arity >= 0 && args.length !== arity) return undefined;
    const nums = args.map(number);
    switch (name) {
      case "TRUE":
        return true;
      case "FALSE":
        return false;
      case "DEFINED": {
        const name = firstArgRaw ?? "";
        return (
          context.variables?.[name.toLowerCase()] !== undefined ||
          context.variables?.[name] !== undefined ||
          context.record?.[name] !== undefined
        );
      }
      case "NOT":
        return !number(nums[0]);
      case "AND":
        return args.every((a) => !!number(a));
      case "OR":
        return args.some((a) => !!number(a));
      case "ABS":
        return Math.abs(nums[0]!);
      case "INT":
        return Math.trunc(nums[0]!);
      case "SIGN":
        return Math.sign(nums[0]!);
      case "MOD":
        return nums[0]! % nums[1]!;
      case "ROUND": {
        const digits = nums[1] ?? 0;
        if (!Number.isSafeInteger(digits) || digits < 0 || digits > 10)
          return undefined;
        const factor = 10 ** digits;
        return Math.round(nums[0]! * factor) / factor;
      }
      case "MIN":
        return Math.min(...(nums as number[]));
      case "MAX":
        return Math.max(...(nums as number[]));
      case "SUM":
        return (nums as number[]).reduce((a, b) => a + b, 0);
      case "PRODUCT":
        return (nums as number[]).reduce((a, b) => a * b, 1);
      case "AVERAGE":
        return (nums as number[]).reduce((a, b) => a + b, 0) / nums.length;
      case "COUNT":
        return nums.length;
      default:
        return undefined;
    }
  };
  const unary = (): FormulaValue | undefined => {
    const token = peek();
    if (
      token?.kind === "operator" &&
      (token.value === "+" || token.value === "-")
    ) {
      take();
      const value = number(unary());
      return value === undefined
        ? undefined
        : token.value === "-"
          ? -value
          : value;
    }
    return primary();
  };
  const power = (): FormulaValue | undefined => {
    const left = number(unary());
    if (left === undefined) return undefined;
    if (peek()?.kind === "operator" && peek()?.value === "^") {
      take();
      const right = number(unary());
      if (
        right === undefined ||
        !Number.isSafeInteger(right) ||
        Math.abs(right) > 64
      )
        return undefined;
      return left ** right;
    }
    return left;
  };
  const product = (): FormulaValue | undefined => {
    let left = number(power());
    if (left === undefined) return undefined;
    for (;;) {
      const op = peek();
      if (op?.kind !== "operator" || !["*", "/", "%"].includes(op.value)) break;
      take();
      const right = number(power());
      if (right === undefined) return undefined;
      left =
        op.value === "*"
          ? left * right
          : op.value === "/"
            ? right === 0
              ? undefined
              : left / right
            : left % right;
      if (left === undefined || !finite(left)) return undefined;
    }
    return left;
  };
  const additive = (): FormulaValue | undefined => {
    let left = number(product());
    if (left === undefined) return undefined;
    for (;;) {
      const op = peek();
      if (op?.kind !== "operator" || !["+", "-"].includes(op.value)) break;
      take();
      const right = number(product());
      if (right === undefined) return undefined;
      left = op.value === "+" ? left + right : left - right;
      if (!finite(left)) return undefined;
    }
    return left;
  };
  const comparison = (): FormulaValue | undefined => {
    let left = additive();
    if (left === undefined) return undefined;
    for (;;) {
      const op = peek();
      if (!op) break;
      if (
        op.kind === "identifier" &&
        ["AND", "OR"].includes(op.value.toUpperCase())
      ) {
        take();
        const right = additive();
        if (right === undefined) return undefined;
        left =
          op.value.toUpperCase() === "AND"
            ? !!number(left) && !!number(right)
            : !!number(left) || !!number(right);
        continue;
      }
      if (
        op.kind !== "operator" ||
        !["=", "<>", "<", "<=", ">", ">="].includes(op.value)
      )
        break;
      take();
      const right = additive();
      if (right === undefined) return undefined;
      switch (op.value) {
        case "=":
          left = left === right;
          break;
        case "<>":
          left = left !== right;
          break;
        case "<":
          left = number(left)! < number(right)!;
          break;
        case "<=":
          left = number(left)! <= number(right)!;
          break;
        case ">":
          left = number(left)! > number(right)!;
          break;
        case ">=":
          left = number(left)! >= number(right)!;
          break;
        default:
          return undefined;
      }
    }
    return left;
  };
  const result = comparison();
  return position === tokens.length ? result : undefined;
}

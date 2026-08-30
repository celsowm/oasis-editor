import { For, createEffect, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { EditorMathExpression } from "@/core/model.js";
import { EMPTY_EDITOR_MATH_EXPRESSION } from "@/core/model.js";
import { parseLinearMath, serializeLinearMath } from "@/core/math/linear.js";
import { Button } from "@/ui/public/Button.js";
import { Dialog } from "./Dialog.js";

export interface EquationDialogProps {
  isOpen: boolean;
  initial?: EditorMathExpression;
  onClose: () => void;
  onApply: (expression: EditorMathExpression) => void;
}

const TEMPLATES = [
  ["\\frac{□}{□}", "\\frac{a}{b}"],
  ["\\sqrt{□}", "\\sqrt{x}"],
  ["x^□", "x^{2}"],
  ["x_□", "x_{i}"],
  ["∑", "\\sum_{i=1}^{n} i"],
  ["∫", "∫ f(x) dx"],
  ["[ ]", "(a+b)"],
  ["[a b]", "\\matrix{a & b \\ c & d}"],
] as const;

export function EquationDialog(props: EquationDialogProps): JSX.Element {
  const t = useI18n();
  const [linear, setLinear] = createSignal("");
  const [expression, setExpression] = createSignal<EditorMathExpression>(
    EMPTY_EDITOR_MATH_EXPRESSION,
  );

  createEffect((): void => {
    if (!props.isOpen) return;
    const initial = props.initial ?? EMPTY_EDITOR_MATH_EXPRESSION;
    setExpression(initial);
    setLinear(serializeLinearMath(initial));
  });

  const updateLinear = (value: string): void => {
    setLinear(value);
    setExpression(parseLinearMath(value));
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.equation.title")}
      onClose={props.onClose}
      size="lg"
      closeOnOverlayClick={false}
      class="oasis-editor-equation-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={props.onClose}>
            {t("generic.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={(): void => props.onApply(expression())}
            data-testid="editor-equation-apply"
          >
            {t("dialog.equation.insert")}
          </Button>
        </>
      }
    >
      <div class="oasis-editor-equation-editor">
        <div
          class="oasis-editor-equation-palette"
          aria-label={t("dialog.equation.structures")}
        >
          <For each={TEMPLATES}>
            {([label, value]): JSX.Element => (
              <button
                type="button"
                onClick={(): void => updateLinear(value)}
                data-testid="editor-equation-template"
              >
                {label}
              </button>
            )}
          </For>
        </div>
        <label class="oasis-editor-equation-linear">
          <span>{t("dialog.equation.linear")}</span>
          <textarea
            value={linear()}
            spellcheck={false}
            onInput={(event): void => updateLinear(event.currentTarget.value)}
            data-testid="editor-equation-linear"
          />
        </label>
        <div
          class="oasis-editor-equation-preview"
          aria-live="polite"
          data-testid="editor-equation-preview"
        >
          {serializeLinearMath(expression()) || t("dialog.equation.empty")}
        </div>
      </div>
    </Dialog>
  );
}

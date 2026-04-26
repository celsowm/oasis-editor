import { Component, createSignal, For, onMount, createMemo } from "solid-js";
import { PageTemplate } from "../../core/pages/PageTemplateTypes.js";
import { render } from "solid-js/web";

export interface RulerProps {
  template: PageTemplate | null;
  initialIndentation?: number;
  onIndentationChange?: (indent: number) => void;
}

export const RulerComponent: Component<RulerProps> = (props) => {
  const [indentation, setIndentation] = createSignal(props.initialIndentation || 0);

  const pxPerInch = 96;
  const tickSpacing = pxPerInch / 8;

  const numTicks = createMemo(() => {
    if (!props.template) return 0;
    const { margins, size } = props.template;
    return Math.floor((size.width - margins.left - margins.right) / tickSpacing);
  });

  const leftIndentBase = createMemo(() => {
    if (!props.template) return 0;
    return props.template.margins.left + indentation();
  });

  const handleDrag = (e: MouseEvent) => {
    if (!props.template) return;
    const startX = e.clientX;
    const initialIndent = indentation();
    const marginLeft = props.template.margins.left;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newIndent = Math.max(0, initialIndent + deltaX);
      setIndentation(newIndent);
      props.onIndentationChange?.(newIndent);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div class="oasis-ruler-container">
      <div 
        class="oasis-ruler" 
        style={{ width: props.template ? `${props.template.size.width}px` : '100%' }}
      >
        {props.template && (
          <>
            {/* Left margin area */}
            <div 
              class="oasis-ruler-margin oasis-ruler-margin-left" 
              style={{ width: `${props.template.margins.left}px` }}
            ></div>

            {/* Right margin area */}
            <div 
              class="oasis-ruler-margin oasis-ruler-margin-right" 
              style={{ 
                width: `${props.template.margins.right}px`,
                left: `${props.template.size.width - props.template.margins.right}px`
              }}
            ></div>

            {/* Ticks container */}
            <div 
              class="oasis-ruler-ticks" 
              style={{ 
                left: `${props.template.margins.left}px`,
                width: `${props.template.size.width - props.template.margins.left - props.template.margins.right}px`
              }}
            >
              <For each={Array.from({ length: numTicks() + 1 })}>
                {(_, i) => (
                  <div 
                    class="oasis-ruler-tick" 
                    classList={{
                      "oasis-ruler-tick-inch": i() % 8 === 0,
                      "oasis-ruler-tick-half": i() % 8 !== 0 && i() % 4 === 0,
                      "oasis-ruler-tick-quarter": i() % 4 !== 0 && i() % 2 === 0,
                    }}
                    style={{ left: `${i() * tickSpacing}px` }}
                  >
                    {i() % 8 === 0 && <span>{i() / 8}</span>}
                  </div>
                )}
              </For>
            </div>

            {/* Markers */}
            <div 
              class="oasis-ruler-marker oasis-ruler-left-indent"
              style={{ left: `${leftIndentBase()}px` }}
              onMouseDown={handleDrag}
            >
              <svg width="11" height="5" viewBox="0 0 11 5">
                <rect x="0" y="0" width="11" height="5" fill="#f0f0f0" stroke="#888" stroke-width="1"/>
              </svg>
            </div>

            <div 
              class="oasis-ruler-marker oasis-ruler-hanging-indent"
              style={{ left: `${leftIndentBase()}px` }}
            >
              <svg width="11" height="9" viewBox="0 0 11 9">
                <path d="M5.5,0 L11,4 L11,9 L0,9 L0,4 Z" fill="#f0f0f0" stroke="#888" stroke-width="1"/>
              </svg>
            </div>

            <div 
              class="oasis-ruler-marker oasis-ruler-first-line"
              style={{ left: `${leftIndentBase()}px` }}
            >
              <svg width="11" height="9" viewBox="0 0 11 9">
                <path d="M0,0 L11,0 L11,5 L5.5,9 L0,5 Z" fill="#f0f0f0" stroke="#888" stroke-width="1"/>
              </svg>
            </div>

            <div 
              class="oasis-ruler-marker oasis-ruler-right-indent"
              style={{ left: `${props.template.size.width - props.template.margins.right}px` }}
            >
              <svg width="11" height="9" viewBox="0 0 11 9">
                <path d="M5.5,0 L11,4 L11,9 L0,9 L0,4 Z" fill="#f0f0f0" stroke="#888" stroke-width="1"/>
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export class Ruler {
  private dispose: () => void;
  private setTemplate: (t: PageTemplate | null) => void;
  private setIndent: (i: number) => void;
  private onIndentationChangeCallback?: (indent: number) => void;

  constructor(container: HTMLElement) {
    const [template, setTemplate] = createSignal<PageTemplate | null>(null);
    const [indent, setIndent] = createSignal(0);
    this.setTemplate = setTemplate;
    this.setIndent = setIndent;

    this.dispose = render(() => (
      <RulerComponent 
        template={template()} 
        initialIndentation={indent()}
        onIndentationChange={(val) => {
          this.setIndent(val);
          this.onIndentationChangeCallback?.(val);
        }}
      />
    ), container);
  }

  onIndentationChange(cb: (indent: number) => void) {
    this.onIndentationChangeCallback = cb;
  }

  setIndentation(indent: number) {
    this.setIndent(indent);
  }

  update(template: PageTemplate, currentIndent: number = 0) {
    this.setTemplate(template);
    this.setIndent(currentIndent);
  }

  destroy() {
    this.dispose();
  }
}

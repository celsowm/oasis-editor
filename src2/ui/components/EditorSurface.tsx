import { For, Show } from "solid-js";
import type { Accessor } from "solid-js";
import type { Editor2State } from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";

interface EditorSurfaceProps {
  state: Accessor<Editor2State>;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onBlockMouseDown: (
    blockId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
}

export function EditorSurface(props: EditorSurfaceProps) {
  return (
    <div class="oasis-editor-2-paper">
      <div
        class="oasis-editor-2-surface"
        data-testid="editor-2-surface"
        onMouseDown={props.onSurfaceMouseDown}
      >
        <For each={props.state().blocks}>
          {(block, blockIndexAccessor) => {
            const chars = () => Array.from(block.text);
            const isEmptyBlockSelected = () => {
              const state = props.state();
              const normalized = normalizeSelection(state);
              if (normalized.isCollapsed) {
                return false;
              }

              const blockIndex = blockIndexAccessor();
              if (block.text.length > 0) {
                return false;
              }

              return blockIndex >= normalized.startIndex && blockIndex <= normalized.endIndex;
            };
            const isCharSelected = (charIndex: number) => {
              const state = props.state();
              const normalized = normalizeSelection(state);
              if (normalized.isCollapsed) {
                return false;
              }

              const blockIndex = blockIndexAccessor();
              if (blockIndex < normalized.startIndex || blockIndex > normalized.endIndex) {
                return false;
              }

              if (normalized.startIndex === normalized.endIndex) {
                return charIndex >= normalized.start.offset && charIndex < normalized.end.offset;
              }

              if (blockIndex === normalized.startIndex) {
                return charIndex >= normalized.start.offset;
              }

              if (blockIndex === normalized.endIndex) {
                return charIndex < normalized.end.offset;
              }

              return true;
            };

            return (
              <p
                class="oasis-editor-2-block"
                data-block-id={block.id}
                data-testid="editor-2-block"
                onMouseDown={(event) => props.onBlockMouseDown(block.id, event)}
              >
                <Show
                  when={chars().length > 0}
                  fallback={
                    <span
                      classList={{
                        "oasis-editor-2-empty-char": true,
                        "oasis-editor-2-empty-char-selected": isEmptyBlockSelected(),
                      }}
                      data-empty-block="true"
                      data-testid="editor-2-empty-char"
                    >
                      {"\u00A0"}
                    </span>
                  }
                >
                  <For each={chars()}>
                    {(char, index) => (
                      <span
                        classList={{
                          "oasis-editor-2-char": true,
                          "oasis-editor-2-char-selected": isCharSelected(index()),
                        }}
                        data-char-index={index()}
                        data-testid="editor-2-char"
                      >
                        {char}
                      </span>
                    )}
                  </For>
                </Show>
              </p>
            );
          }}
        </For>
      </div>
    </div>
  );
}

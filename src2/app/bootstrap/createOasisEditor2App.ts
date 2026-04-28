export interface OasisEditor2Instance {
  dispose: () => void;
}

export function createOasisEditor2(container: HTMLElement): OasisEditor2Instance {
  container.innerHTML = `
    <div class="oasis-editor-2-shell">
      <div class="oasis-editor-2-card">
        <p class="oasis-editor-2-eyebrow">oasis-editor-2</p>
        <h1>Hello world</h1>
        <p class="oasis-editor-2-copy">
          Minimal shell loaded. No document runtime, selection, or formatting yet.
        </p>
      </div>
    </div>
  `;

  return {
    dispose: () => {
      container.innerHTML = "";
    },
  };
}

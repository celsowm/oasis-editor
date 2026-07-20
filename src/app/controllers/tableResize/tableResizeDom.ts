export function getGuideBounds(viewportRef: () => HTMLElement | undefined): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const viewport = viewportRef();
  if (!viewport) {
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  const rect = viewport.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: Math.max(0, rect.width),
    height: Math.max(0, rect.height),
  };
}

let resizeCursorOwner: object | null = null;

function setResizeCursorClass(isCol: boolean, owner: object): void {
  resizeCursorOwner = owner;
  if (isCol) {
    document.body.classList.add("oasis-editor-hover-col-resize");
    document.body.classList.remove("oasis-editor-hover-row-resize");
  } else {
    document.body.classList.add("oasis-editor-hover-row-resize");
    document.body.classList.remove("oasis-editor-hover-col-resize");
  }
}

export function clearResizeCursorClasses(owner?: object): void {
  if (owner && resizeCursorOwner !== owner) return;
  resizeCursorOwner = null;
  document.body.classList.remove("oasis-editor-hover-col-resize");
  document.body.classList.remove("oasis-editor-hover-row-resize");
}

export function setHoverCursorClass(isCol: boolean, owner: object): void {
  setResizeCursorClass(isCol, owner);
}

export function setActiveCursorClass(isCol: boolean, owner: object): void {
  setResizeCursorClass(isCol, owner);
}

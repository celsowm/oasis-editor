export function getGuideBounds(viewportRef: () => HTMLElement | undefined): { left: number; top: number; width: number; height: number; } {
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

function setResizeCursorClass(isCol: boolean): void {
  if (isCol) {
    document.body.classList.add("oasis-editor-hover-col-resize");
    document.body.classList.remove("oasis-editor-hover-row-resize");
  } else {
    document.body.classList.add("oasis-editor-hover-row-resize");
    document.body.classList.remove("oasis-editor-hover-col-resize");
  }
}

export function clearResizeCursorClasses(): void {
  document.body.classList.remove("oasis-editor-hover-col-resize");
  document.body.classList.remove("oasis-editor-hover-row-resize");
}

export function setHoverCursorClass(isCol: boolean): void {
  setResizeCursorClass(isCol);
}

export function setActiveCursorClass(isCol: boolean): void {
  setResizeCursorClass(isCol);
}

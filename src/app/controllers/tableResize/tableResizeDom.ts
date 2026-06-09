export function getGuideBounds(viewportRef: () => HTMLElement | undefined) {
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

function setResizeCursorClass(isCol: boolean) {
  if (isCol) {
    document.body.classList.add("oasis-editor-hover-col-resize");
    document.body.classList.remove("oasis-editor-hover-row-resize");
  } else {
    document.body.classList.add("oasis-editor-hover-row-resize");
    document.body.classList.remove("oasis-editor-hover-col-resize");
  }
}

export function clearResizeCursorClasses() {
  document.body.classList.remove("oasis-editor-hover-col-resize");
  document.body.classList.remove("oasis-editor-hover-row-resize");
}

export function setHoverCursorClass(isCol: boolean) {
  setResizeCursorClass(isCol);
}

export function setActiveCursorClass(isCol: boolean) {
  setResizeCursorClass(isCol);
}

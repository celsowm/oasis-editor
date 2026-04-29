interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SelectionOverlayProps {
  boxes: SelectionBox[];
}

export function SelectionOverlay(props: SelectionOverlayProps) {
  return (
    <>
      {props.boxes.map((box) => (
        <span
          aria-hidden="true"
          class="oasis-editor-2-selection-box"
          data-testid="editor-2-selection-box"
          style={{
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
        />
      ))}
    </>
  );
}

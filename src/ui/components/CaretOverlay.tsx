interface CaretOverlayProps {
  active: boolean;
  left: number;
  top: number;
  height: number;
}

export function CaretOverlay(props: CaretOverlayProps) {
  return (
    <span
      aria-hidden="true"
      classList={{
        "oasis-editor-caret": true,
        "oasis-editor-caret-active": props.active,
      }}
      style={{
        left: `${props.left}px`,
        top: `${props.top}px`,
        height: `${props.height}px`,
      }}
    />
  );
}

import { Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import {
  usePopoverPosition,
  type PopoverPlacement,
} from "./usePopoverPosition.js";
import { useDismiss } from "./useDismiss.js";

export interface PopoverTriggerApi {
  /** Attach to the element that the panel should be anchored/positioned to. */
  ref: (el: HTMLElement) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Renders the trigger; must attach `api.ref` to the positioning anchor. */
  trigger: (api: PopoverTriggerApi) => JSX.Element;
  children: JSX.Element;
  placement?: PopoverPlacement;
  panelClass?: string;
  panelRole?: JSX.HTMLAttributes<HTMLDivElement>["role"];
  panelTestId?: string;
  onPanelMouseLeave?: () => void;
  closeOnEscape?: boolean;
  /**
   * Keep the panel mounted (hidden) while closed so nested Solid state — e.g.
   * an open sub-menu inside a metrics/table panel — survives reopening.
   */
  keepMounted?: boolean;
}

/**
 * The single portalled popover primitive. Every dropdown / split / color /
 * grid / spacing menu composes this instead of re-implementing portal +
 * positioning + click-outside.
 */
export function Popover(props: PopoverProps): JSX.Element {
  let anchorRef: HTMLElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const coords = usePopoverPosition({
    anchor: (): HTMLElement | undefined => anchorRef,
    panel: (): HTMLDivElement | undefined => panelRef,
    open: (): boolean => props.open,
    placement: props.placement,
  });

  useDismiss({
    refs: () => [anchorRef, panelRef],
    open: (): boolean => props.open,
    onDismiss: (): void => props.onOpenChange(false),
    closeOnEscape: props.closeOnEscape,
  });

  const panel = (portalled: boolean): JSX.Element => (
    <div
      ref={panelRef}
      class={props.panelClass}
      role={props.panelRole}
      data-testid={props.panelTestId}
      style={
        portalled
          ? {
              position: "absolute",
              top: `${coords().top}px`,
              left: `${coords().left}px`,
            }
          : { display: "none" }
      }
      aria-hidden={portalled ? undefined : "true"}
      onMouseLeave={props.onPanelMouseLeave}
    >
      {props.children}
    </div>
  );

  return (
    <>
      {props.trigger({
        ref: (el): HTMLElement => (anchorRef = el),
        open: props.open,
        setOpen: props.onOpenChange,
        toggle: (): void => props.onOpenChange(!props.open),
      })}
      <Show when={props.open}>
        <Portal>{panel(true)}</Portal>
      </Show>
      <Show when={!props.open && props.keepMounted}>{panel(false)}</Show>
    </>
  );
}

import { Component, JSX, splitProps, createSignal, Show, createEffect, onMount, onCleanup } from 'solid-js';
import { createIcons, icons } from 'lucide';

export type ToolbarResponseMode = 'wrap' | 'overflow';

interface ToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
  mode?: ToolbarResponseMode;
}

export const Toolbar: Component<ToolbarProps> = (props) => {
  const [local, others] = splitProps(props, ['children', 'mode', 'class', 'classList']);
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [overflowIndex, setOverflowIndex] = createSignal(-1);
  let toolbarRef: HTMLDivElement | undefined;
  let visibleContentRef: HTMLDivElement | undefined;
  let popoverContentRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;

  const applyPopoverVisibility = (idx: number) => {
    if (!popoverContentRef) return;
    Array.from(popoverContentRef.children).forEach((c, i) => {
      (c as HTMLElement).style.display = (idx < 0 || i < idx) ? 'none' : '';
    });
  };

  const measureOverflow = () => {
    if (props.mode !== 'overflow' || !visibleContentRef) return;

    const children = Array.from(visibleContentRef.children) as HTMLElement[];
    // Reset visibility before measuring
    children.forEach(c => { c.style.display = ''; });
    // Force a layout pass
    void visibleContentRef.offsetWidth;

    const containerRect = visibleContentRef.getBoundingClientRect();
    const maxRight = containerRect.right - 2;

    let firstOverflow = -1;
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      if (r.right > maxRight) {
        firstOverflow = i;
        break;
      }
    }

    setOverflowIndex(firstOverflow);

    if (firstOverflow >= 0) {
      children.forEach((c, i) => {
        if (i >= firstOverflow) c.style.display = 'none';
      });
    }

    applyPopoverVisibility(firstOverflow);
  };

  createEffect(() => {
    isExpanded();
    queueMicrotask(() => createIcons({ icons, nameAttr: "data-lucide" }));
  });

  // After popover renders, hide non-overflow items inside it
  createEffect(() => {
    if (isExpanded()) {
      queueMicrotask(() => {
        applyPopoverVisibility(overflowIndex());
        createIcons({ icons, nameAttr: "data-lucide" });
      });
    }
  });

  const handleDocumentClick = (e: MouseEvent) => {
    if (!isExpanded()) return;
    const target = e.target as Node;
    if (toolbarRef && !toolbarRef.contains(target)) {
      setIsExpanded(false);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleDocumentClick);
    if (props.mode === 'overflow' && toolbarRef) {
      // Initial measure (delay so icons & fonts are mounted)
      setTimeout(measureOverflow, 50);
      // Re-measure when fonts load
      if ((document as any).fonts?.ready) {
        (document as any).fonts.ready.then(() => measureOverflow());
      }
      resizeObserver = new ResizeObserver(() => measureOverflow());
      resizeObserver.observe(toolbarRef);
    }
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleDocumentClick);
    resizeObserver?.disconnect();
  });

  return (
    <div
      ref={toolbarRef}
      class={`oasis-editor-toolbar ${local.class || ''}`}
      classList={{
        'mode-wrap': local.mode === 'wrap',
        'mode-overflow': local.mode === 'overflow',
        'is-expanded': isExpanded(),
        'has-overflow': overflowIndex() >= 0,
        ...local.classList
      }}
      {...others}
    >
      <div ref={visibleContentRef} class="oasis-editor-toolbar-content">
        {local.children}
      </div>

      <Show when={props.mode === 'overflow'}>
        <button
          class="oasis-toolbar-more-btn"
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded()); }}
          title={isExpanded() ? "Show less" : "More options"}
        >
          <i data-lucide={isExpanded() ? "chevron-up" : "more-horizontal"} />
        </button>
        <Show when={isExpanded() && overflowIndex() >= 0}>
          <div class="oasis-toolbar-overflow-popover">
            <div ref={popoverContentRef} class="oasis-editor-toolbar-content oasis-toolbar-overflow-content">
              {local.children}
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export const ToolbarGroup: Component<{ children: JSX.Element }> = (props) => (
  <div class="oasis-editor-toolbar-group">
    {props.children}
  </div>
);

export const ToolbarSeparator: Component = () => (
  <div class="oasis-editor-toolbar-separator" />
);

interface ToolbarButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  icon: string;
  command?: string;
  state?: string;
  active?: boolean;
}

export const ToolbarButton: Component<ToolbarButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['icon', 'command', 'state', 'active', 'id', 'class']);

  return (
    <button
      id={local.id}
      type="button"
      data-command={local.command}
      data-state={local.state}
      class={local.class}
      classList={{ 'active': !!local.active }}
      {...others}
    >
      <i data-lucide={local.icon} />
    </button>
  );
};

interface ToolbarSelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
}

export const ToolbarSelect: Component<ToolbarSelectProps> = (props) => {
    const [local, others] = splitProps(props, ['id', 'class']);
    return (
        <select
            id={local.id}
            class={`oasis-toolbar-select ${local.class || ''}`}
            {...others}
        >
            {others.children}
        </select>
    );
};

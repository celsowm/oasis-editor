import { Component, JSX, splitProps, createSignal, Show, createEffect } from 'solid-js';
import { createIcons, icons } from 'lucide';

export type ToolbarResponseMode = 'wrap' | 'overflow';

interface ToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
  mode?: ToolbarResponseMode;
}

export const Toolbar: Component<ToolbarProps> = (props) => {
  const [local, others] = splitProps(props, ['children', 'mode', 'class', 'classList']);
  const [isExpanded, setIsExpanded] = createSignal(false);
  let toolbarRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (isExpanded() || true) {
        createIcons({ icons, nameAttr: "data-lucide" });
    }
  });

  return (
    <div 
      ref={toolbarRef}
      class={`oasis-editor-toolbar ${local.class || ''}`} 
      classList={{ 
        'mode-wrap': local.mode === 'wrap',
        'mode-overflow': local.mode === 'overflow',
        'is-expanded': isExpanded(),
        ...local.classList
      }}
      {...others}
    >
      <div class="oasis-editor-toolbar-content">
        {local.children}
      </div>
      
      <Show when={props.mode === 'overflow'}>
        <button 
          class="oasis-toolbar-more-btn" 
          onClick={() => setIsExpanded(!isExpanded())}
          title={isExpanded() ? "Show less" : "More options"}
        >
          <i data-lucide={isExpanded() ? "chevron-left" : "more-horizontal"} />
        </button>
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

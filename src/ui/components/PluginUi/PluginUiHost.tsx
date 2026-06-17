import {
  For,
  Show,
  children,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Accessor,
  type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";
import type {
  FloatingActionContribution,
  OasisEditor,
  OasisPluginUiSnapshot,
  SidePanelContribution,
} from "@/core/plugin.js";
import { resolveCommandRef } from "@/core/commands/CommandRef.js";
import { FloatingActionButton } from "@/ui/public/FloatingActionButton.js";
import {
  SidePanel,
  SidePanelBody,
  SidePanelHeader,
} from "@/ui/public/SidePanel.js";
import { IconButton } from "@/ui/public/IconButton.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import { t, type TranslationKey } from "@/i18n/index.js";

export interface PluginUiHostProps {
  editor: Accessor<OasisEditor>;
  children: JSX.Element;
}

const EMPTY_SNAPSHOT: OasisPluginUiSnapshot = {
  floatingActions: [],
  sidePanels: [],
  activeSidePanelId: null,
};

export function PluginUiHost(props: PluginUiHostProps): JSX.Element {
  const resolvedChildren = children(() => props.children);
  const [snapshot, setSnapshot] =
    createSignal<OasisPluginUiSnapshot>(EMPTY_SNAPSHOT);

  createEffect(() => {
    const editor = props.editor();
    setSnapshot(editor.ui.getSnapshot());
    const unsubscribe = editor.ui.onChange(() => {
      setSnapshot(editor.ui.getSnapshot());
    });
    onCleanup(unsubscribe);
  });

  const activePanel = createMemo(() =>
    snapshot().sidePanels.find(
      (panel) => panel.id === snapshot().activeSidePanelId,
    ),
  );
  const activeMode = () => activePanel()?.mode ?? "dock";
  const dockPanel = () => (activeMode() === "dock" ? activePanel() : undefined);
  const overlayPanel = () =>
    activeMode() === "overlay" ? activePanel() : undefined;
  const containerActions = () =>
    snapshot().floatingActions.filter(
      (action) => (action.scope ?? "container") === "container",
    );
  const viewportActions = () =>
    snapshot().floatingActions.filter((action) => action.scope === "viewport");

  const actionGroup = (
    actions: Accessor<FloatingActionContribution[]>,
    viewport = false,
  ) => (
    <For each={groupActionsByPlacement(actions())}>
      {(group) => (
        <div
          class="oasis-editor-plugin-floating-actions"
          classList={{
            [`oasis-editor-plugin-floating-actions-${group.placement}`]: true,
            "oasis-editor-plugin-floating-actions-viewport": viewport,
          }}
        >
          <For each={group.actions}>
            {(action) => (
              <FloatingActionButton
                icon={action.icon ?? "sparkles"}
                label={actionLabel(action)}
                disabled={!canExecuteAction(props.editor(), action)}
                data-testid={`plugin-floating-action-${action.id}`}
                onClick={() => executeAction(props.editor(), action)}
              />
            )}
          </For>
        </div>
      )}
    </For>
  );

  return (
    <div
      class="oasis-editor-plugin-ui-host"
      classList={{
        "has-docked-side-panel": Boolean(dockPanel()),
      }}
    >
      <div class="oasis-editor-plugin-ui-main">{resolvedChildren()}</div>
      <Show when={dockPanel()}>
        {(panel) => renderPanel(props.editor, panel())}
      </Show>
      <Show when={overlayPanel()}>
        {(panel) => (
          <div class="oasis-editor-plugin-side-panel-overlay">
            {renderPanel(props.editor, panel())}
          </div>
        )}
      </Show>
      {actionGroup(containerActions)}
      <Show when={viewportActions().length > 0}>
        <Portal>{actionGroup(viewportActions, true)}</Portal>
      </Show>
    </div>
  );
}

function executeAction(
  editor: OasisEditor,
  action: FloatingActionContribution,
): void {
  const resolved = resolveCommandRef(action.command);
  editor.commands.execute(resolved.name, resolved.payload);
}

function canExecuteAction(
  editor: OasisEditor,
  action: FloatingActionContribution,
): boolean {
  const resolved = resolveCommandRef(action.command);
  return editor.commands.canExecute(resolved.name, resolved.payload);
}

function actionLabel(action: FloatingActionContribution): string {
  if (action.tooltip) return action.tooltip;
  if (action.labelKey) return t(action.labelKey as TranslationKey);
  return action.label ?? action.id;
}

function renderPanel(
  editor: Accessor<OasisEditor>,
  panel: SidePanelContribution,
): JSX.Element {
  const close = () => editor().ui.closeSidePanel(panel.id);
  return (
    <SidePanel
      mode={panel.mode ?? "dock"}
      width={panel.width}
      data-testid={`plugin-side-panel-${panel.id}`}
    >
      <SidePanelHeader>
        <div class="oasis-editor-plugin-side-panel-title">
          <Show when={panel.icon}>
            <span class="oasis-editor-plugin-side-panel-icon">
              <ToolIcon name={panel.icon!} />
            </span>
          </Show>
          <span>
            {panel.titleKey ? t(panel.titleKey as TranslationKey) : panel.title}
          </span>
        </div>
        <IconButton icon="x" label="Close panel" size="sm" onClick={close} />
      </SidePanelHeader>
      <SidePanelBody>
        {panel.render({
          editor: editor(),
          commands: editor().commands,
          ui: editor().ui,
          panelId: panel.id,
          closePanel: close,
          getState: () => editor().state,
          getDocument: () => editor().state.document,
          getSelection: () => editor().state.selection,
        })}
      </SidePanelBody>
    </SidePanel>
  );
}

function groupActionsByPlacement(actions: FloatingActionContribution[]) {
  const groups = new Map<
    NonNullable<FloatingActionContribution["placement"]>,
    FloatingActionContribution[]
  >();
  for (const action of actions) {
    const placement = action.placement ?? "bottom-right";
    groups.set(placement, [...(groups.get(placement) ?? []), action]);
  }
  return Array.from(groups.entries()).map(([placement, groupActions]) => ({
    placement,
    actions: groupActions,
  }));
}

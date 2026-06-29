import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import {
  ActionRow,
  Button,
  Checkbox,
  Dialog,
  DialogFooter,
  FieldGroup,
  FloatingActionButton,
  FormField,
  Heading,
  IconButton,
  SelectField,
  SidePanel,
  SidePanelBody,
  SidePanelFooter,
  SidePanelHeader,
  StatusText,
  SurfaceButton,
  Tabs,
  Text,
  TextAreaField,
  TextField,
} from "@/ui/public/index.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("plugin UI primitives", () => {
  it("renders dialog content with tabs and footer", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Dialog
          isOpen
          title="Plugin settings"
          onClose={() => {}}
          footer={
            <DialogFooter>
              <Button variant="primary">Apply</Button>
            </DialogFooter>
          }
        >
          <Tabs
            defaultValue="main"
            items={[
              { id: "main", label: "Main", panel: <p>Main panel</p> },
              {
                id: "advanced",
                label: "Advanced",
                panel: <p>Advanced panel</p>,
              },
            ]}
          />
        </Dialog>
      ),
      host,
    );

    expect(host.textContent).toContain("Plugin settings");
    expect(host.textContent).toContain("Main panel");
    expect(host.textContent).toContain("Apply");
    dispose();
  });

  it("dispatches field changes", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onTextChange = vi.fn();
    const onCheckboxChange = vi.fn();
    const onSelectChange = vi.fn();
    const dispose = render(
      () => (
        <>
          <TextField label="Name" value="" onChange={onTextChange} />
          <Checkbox label="Enabled" onChange={onCheckboxChange} />
          <SelectField
            label="Mode"
            value="fast"
            onChange={onSelectChange}
            options={[
              { value: "fast", label: "Fast" },
              { value: "safe", label: "Safe" },
            ]}
          />
        </>
      ),
      host,
    );

    const input = host.querySelector(
      "input[type='text'], input:not([type])",
    ) as HTMLInputElement;
    input.value = "Plugin";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    const checkbox = host.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    const select = host.querySelector("select") as HTMLSelectElement;
    select.value = "safe";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onTextChange).toHaveBeenCalledWith("Plugin");
    expect(onCheckboxChange).toHaveBeenCalledWith(true);
    expect(onSelectChange).toHaveBeenCalledWith("safe");
    dispose();
  });

  it("renders semantic composition primitives", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onTextAreaChange = vi.fn();
    const onSurfaceClick = vi.fn();
    const dispose = render(
      () => (
        <>
          <Heading level={3}>Section title</Heading>
          <FieldGroup legend="Details">
            <FormField label="Summary">
              <Text>Inline summary</Text>
            </FormField>
            <TextAreaField
              label="Notes"
              value=""
              onChange={onTextAreaChange}
              data-testid="plugin-notes"
            />
          </FieldGroup>
          <ActionRow align="between">
            <StatusText tone="muted">Ready</StatusText>
            <SurfaceButton icon="x" label="Dismiss" onClick={onSurfaceClick} />
          </ActionRow>
        </>
      ),
      host,
    );

    const textarea = host.querySelector(
      "[data-testid='plugin-notes']",
    ) as HTMLTextAreaElement;
    textarea.value = "Updated";
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    const surfaceButton = host.querySelector(
      ".oasis-editor-ui-surface-button",
    ) as HTMLButtonElement;
    surfaceButton.click();

    expect(host.textContent).toContain("Section title");
    expect(host.textContent).toContain("Inline summary");
    expect(host.textContent).toContain("Ready");
    expect(onTextAreaChange).toHaveBeenCalledWith("Updated");
    expect(onSurfaceClick).toHaveBeenCalledOnce();
    dispose();
  });

  it("respects disabled buttons", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onButtonClick = vi.fn();
    const onIconClick = vi.fn();
    const dispose = render(
      () => (
        <>
          <Button disabled onClick={onButtonClick}>
            Save
          </Button>
          <IconButton
            disabled
            icon="settings"
            label="Settings"
            onClick={onIconClick}
          />
        </>
      ),
      host,
    );

    const buttons = host.querySelectorAll("button");
    buttons.forEach((button) => button.click());
    expect(onButtonClick).not.toHaveBeenCalled();
    expect(onIconClick).not.toHaveBeenCalled();
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
    dispose();
  });

  it("allows custom button types", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Button type="submit" variant="primary">
          Submit
        </Button>
      ),
      host,
    );

    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button.type).toBe("submit");
    dispose();
  });

  it("renders floating action and side panel primitives", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onAction = vi.fn();
    const dispose = render(
      () => (
        <>
          <FloatingActionButton
            icon="sparkles"
            label="Assistant"
            onClick={onAction}
          />
          <SidePanel mode="dock" width={320}>
            <SidePanelHeader>Assistant</SidePanelHeader>
            <SidePanelBody>Panel body</SidePanelBody>
            <SidePanelFooter>Footer</SidePanelFooter>
          </SidePanel>
        </>
      ),
      host,
    );

    const action = host.querySelector(
      ".oasis-editor-plugin-floating-action",
    ) as HTMLButtonElement;
    action.click();

    expect(onAction).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Assistant");
    expect(host.textContent).toContain("Panel body");
    expect(host.querySelector(".oasis-editor-plugin-side-panel")).toBeTruthy();
    dispose();
  });
});

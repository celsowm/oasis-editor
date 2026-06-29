import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import {
  ActionRow,
  Button,
  Checkbox,
  ColorField,
  Dialog,
  DialogFooter,
  FieldGroup,
  FloatingActionButton,
  FormField,
  Grid,
  Heading,
  IconButton,
  SelectField,
  SidePanel,
  SidePanelBody,
  SidePanelFooter,
  SidePanelHeader,
  StatusText,
  Stack,
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
            <ColorField label="Accent" value="#336699" onChange={() => {}} />
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
    const colorInput = host.querySelector(
      "input[type='color']",
    ) as HTMLInputElement;
    textarea.value = "Updated";
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    const surfaceButton = host.querySelector(
      ".oasis-editor-ui-surface-button",
    ) as HTMLButtonElement;
    surfaceButton.click();

    expect(host.textContent).toContain("Section title");
    expect(host.textContent).toContain("Inline summary");
    expect(host.textContent).toContain("Ready");
    expect(colorInput.value).toBe("#336699");
    expect(onTextAreaChange).toHaveBeenCalledWith("Updated");
    expect(onSurfaceClick).toHaveBeenCalledOnce();
    dispose();
  });

  it("renders MUI-like Stack and Grid layout primitives", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Stack
          component="section"
          class="plugin-stack"
          classList={{ "is-layout": true }}
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, md: 3 }}
          alignItems="center"
          justifyContent="space-between"
          style={{ color: "rgb(1, 2, 3)" }}
          divider={(index) => (
            <span data-testid={`stack-divider-${index}`}>/</span>
          )}
        >
          <Text>Alpha</Text>
          <Text>Beta</Text>
          <Text>Gamma</Text>
        </Stack>
      ),
      host,
    );

    const stack = host.querySelector(".oasis-editor-ui-stack") as HTMLElement;
    expect(stack.tagName).toBe("SECTION");
    expect(stack.classList.contains("plugin-stack")).toBe(true);
    expect(stack.classList.contains("is-layout")).toBe(true);
    expect(stack.style.getPropertyValue("--oasis-stack-direction-xs")).toBe(
      "column",
    );
    expect(stack.style.getPropertyValue("--oasis-stack-direction-sm")).toBe(
      "row",
    );
    expect(stack.style.getPropertyValue("--oasis-stack-spacing-xs")).toBe(
      "8px",
    );
    expect(stack.style.getPropertyValue("--oasis-stack-spacing-md")).toBe(
      "24px",
    );
    expect(stack.style.getPropertyValue("--oasis-stack-align-xs")).toBe(
      "center",
    );
    expect(stack.style.getPropertyValue("--oasis-stack-justify-xs")).toBe(
      "space-between",
    );
    expect(stack.style.color).toBe("rgb(1, 2, 3)");
    expect(
      host.querySelectorAll(".oasis-editor-ui-stack-divider-item"),
    ).toHaveLength(2);
    dispose();
  });

  it("renders responsive Grid variables for container and items", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Grid
          container
          component="section"
          spacing={{ xs: 1, md: 3 }}
          columns={{ xs: 4, md: 12 }}
          direction={{ xs: "column", md: "row" }}
          alignItems="stretch"
          justifyContent="center"
          data-testid="grid-container"
        >
          <Grid size={{ xs: 4, md: 6 }} data-testid="grid-item-a">
            A
          </Grid>
          <Grid size="grow" offset={{ md: "auto" }} data-testid="grid-item-b">
            B
          </Grid>
          <Grid size="auto" offset={1} data-testid="grid-item-c">
            C
          </Grid>
        </Grid>
      ),
      host,
    );

    const container = host.querySelector(
      "[data-testid='grid-container']",
    ) as HTMLElement;
    const itemA = host.querySelector(
      "[data-testid='grid-item-a']",
    ) as HTMLElement;
    const itemB = host.querySelector(
      "[data-testid='grid-item-b']",
    ) as HTMLElement;
    const itemC = host.querySelector(
      "[data-testid='grid-item-c']",
    ) as HTMLElement;

    expect(container.tagName).toBe("SECTION");
    expect(container.classList.contains("oasis-editor-ui-grid-container")).toBe(
      true,
    );
    expect(
      container.style.getPropertyValue("--oasis-grid-row-spacing-xs"),
    ).toBe("8px");
    expect(
      container.style.getPropertyValue("--oasis-grid-column-spacing-md"),
    ).toBe("24px");
    expect(container.style.getPropertyValue("--oasis-grid-columns-xs")).toBe(
      "4",
    );
    expect(container.style.getPropertyValue("--oasis-grid-columns-md")).toBe(
      "12",
    );
    expect(container.style.getPropertyValue("--oasis-grid-direction-md")).toBe(
      "row",
    );
    expect(itemA.style.getPropertyValue("--oasis-grid-size-basis-xs")).toBe(
      "calc(4 / var(--oasis-grid-columns-current) * 100% - " +
        "var(--oasis-grid-column-spacing-xs, 0px) * " +
        "(var(--oasis-grid-columns-current) - 4) / " +
        "var(--oasis-grid-columns-current))",
    );
    expect(itemA.style.getPropertyValue("--oasis-grid-size-max-md")).toBe(
      "calc(6 / var(--oasis-grid-columns-current) * 100% - " +
        "var(--oasis-grid-column-spacing-md, " +
        "var(--oasis-grid-column-spacing-sm, " +
        "var(--oasis-grid-column-spacing-xs, 0px))) * " +
        "(var(--oasis-grid-columns-current) - 6) / " +
        "var(--oasis-grid-columns-current))",
    );
    expect(itemB.style.getPropertyValue("--oasis-grid-size-grow-xs")).toBe("1");
    expect(itemB.style.getPropertyValue("--oasis-grid-offset-md")).toBe("auto");
    expect(itemC.style.getPropertyValue("--oasis-grid-size-basis-xs")).toBe(
      "auto",
    );
    expect(itemC.style.getPropertyValue("--oasis-grid-offset-xs")).toBe(
      "calc(1 / var(--oasis-grid-columns-current) * 100%)",
    );
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

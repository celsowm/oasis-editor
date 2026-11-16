import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { TabStopsDialog } from "@/ui/components/Dialogs/TabStopsDialog.js";
import { createTranslator } from "@/i18n/index.js";
import { I18nProvider } from "@/i18n/I18nContext.js";

function mount() {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(() => <I18nProvider translator={createTranslator(() => "en")}>
    <TabStopsDialog isOpen initial={[{ position: 36, type: "right", leader: "dot" }]}
      initialDefault={24} selectedPosition={36} onApply={onApply} onClose={onClose} />
  </I18nProvider>, host);
  const button = (id: string) => host.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!;
  const field = (id: string) => host.querySelector<HTMLInputElement>(`[data-testid="${id}"]`)!;
  const input = (id: string, value: string) => {
    field(id).value = value;
    field(id).dispatchEvent(new Event("input", {bubbles: true}));
  };
  return {host, dispose, onApply, onClose, button, input, field};
}
afterEach(() => { document.body.innerHTML = ""; });

describe("Word-style Tabs dialog", () => {
  it("selects the ruler stop, stages clear and default interval, then applies", () => {
    const h = mount();
    expect(h.field("editor-tab-stops-position").value).toBe("36");
    expect(h.field("editor-tab-stops-default").value).toBe("24");
    h.button("editor-tab-stops-remove").click();
    h.input("editor-tab-stops-default", "48");
    expect(h.onApply).not.toHaveBeenCalled();
    h.button("editor-tab-stops-apply").click();
    expect(h.onApply).toHaveBeenCalledWith([], [{clear:[36]}, {default:48}]);
    h.dispose();
  });
  it("does not apply staged clear-all when canceled", () => {
    const h = mount();
    h.button("editor-tab-stops-clear").click();
    h.button("editor-tab-stops-cancel").click();
    expect(h.onApply).not.toHaveBeenCalled();
    expect(h.onClose).toHaveBeenCalledOnce();
    h.dispose();
  });
  it("rejects invalid interval and stages an added stop", () => {
    const h = mount();
    h.input("editor-tab-stops-default", "0");
    expect(h.button("editor-tab-stops-apply").disabled).toBe(true);
    h.input("editor-tab-stops-default", "24");
    h.input("editor-tab-stops-position", "72");
    h.button("editor-tab-stops-set").click();
    h.button("editor-tab-stops-apply").click();
    expect(h.onApply).toHaveBeenCalledWith(
      [{position:36,type:"right",leader:"dot"},{position:72,type:"right",leader:"dot"}],
      [{set:[{position:72,type:"right",leader:"dot"}]}]
    );
    h.dispose();
  });
});

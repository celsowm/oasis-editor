import {
  For,
  Show,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import { render } from "solid-js/web";
import { SvgIcon, ToolIcon } from "@/ui/utils/customIcons.js";
import { startIconObserver, stopIconObserver } from "@/ui/utils/IconManager.js";
import review from "../../../scripts/ribbon-parity/icon-review.json";
import "@/styles/oasis-editor.css";
import "@/ui/components/Toolbar/toolbar.css";
import "./iconReview.css";

/** Historical comparison only: the previous font-dependent footnote artwork. */
function LegacyFootnote(): JSX.Element {
  return (
    <SvgIcon>
      <text
        x="2"
        y="18"
        font-family="'Segoe UI', Arial, sans-serif"
        font-size="14"
        font-weight="700"
        fill="currentColor"
      >
        ab
      </text>
      <text
        x="15.5"
        y="11"
        font-family="'Segoe UI', Arial, sans-serif"
        font-size="10"
        font-weight="700"
        fill="#c00000"
      >
        1
      </text>
    </SvgIcon>
  );
}
function LegacyUnderline(): JSX.Element {
  return (
    <span class="oasis-editor-underline-split-glyph" aria-hidden="true">
      U
    </span>
  );
}
function IconReview(): JSX.Element {
  const params = new URLSearchParams(location.search);
  const [theme, setTheme] = createSignal(
    params.get("theme") === "dark" ? "dark" : "light",
  );
  const [candidate, setCandidate] = createSignal(
    params.get("icon") ?? review.candidates[0].id,
  );
  const [surface, setSurface] = createSignal(params.get("surface") ?? "button");
  const chosen = () =>
    review.candidates.find((item) => item.id === candidate())!;
  onMount(() => {
    startIconObserver();
    onCleanup(() => stopIconObserver());
  });
  const sample = (
    name: () => string,
    size: number,
    state: string,
    isAfter: boolean,
  ): JSX.Element => (
    <button
      type="button"
      class="oasis-editor-tool-button icon-review-sample"
      classList={{
        "oasis-editor-tool-button-active": state === "active",
        "icon-review-collapsed": surface() === "collapsed",
        "icon-review-menu": surface() === "menu",
      }}
      style={{ "--review-icon-size": `${size}px` }}
      aria-label={`${chosen().command ?? chosen().action ?? chosen().id}, ${size}px, ${state}`}
      aria-pressed={state === "active"}
      disabled={state === "disabled"}
      data-icon-name={isAfter ? name() : undefined}
      data-icon-size={size}
      data-icon-state={state}
    >
      <Show
        when={name() === "legacyFootnote"}
        fallback={
          <Show
            when={name() === "legacyUnderline"}
            fallback={<ToolIcon name={name()} />}
          >
            <LegacyUnderline />
          </Show>
        }
      >
        <LegacyFootnote />
      </Show>
      <Show when={surface() !== "button"}>
        <span>{chosen().command ?? chosen().action}</span>
      </Show>
    </button>
  );
  return (
    <main class="oasis-editor-app icon-review" data-theme={theme()}>
      <h1>Ribbon SVG review</h1>
      <nav>
        <label>
          Action{" "}
          <select
            aria-label="Action"
            value={candidate()}
            onChange={(event) => setCandidate(event.currentTarget.value)}
          >
            <For each={review.candidates}>
              {(item) => (
                <option value={item.id}>{item.command ?? item.action}</option>
              )}
            </For>
          </select>
        </label>
        <label>
          Theme{" "}
          <select
            aria-label="Theme"
            value={theme()}
            onChange={(event) => setTheme(event.currentTarget.value)}
          >
            <option>light</option>
            <option>dark</option>
          </select>
        </label>
        <label>
          Surface{" "}
          <select
            aria-label="Surface"
            value={surface()}
            onChange={(event) => setSurface(event.currentTarget.value)}
          >
            <For each={review.surfaces}>
              {(value) => <option>{value}</option>}
            </For>
          </select>
        </label>
      </nav>
      <p>
        <strong>{chosen().decision}</strong>: {chosen().defect}
      </p>
      <p>{chosen().result}</p>
      <div class="icon-review-comparison" data-testid="icon-review-sheet">
        <For
          each={
            [
              ["Before", () => chosen().before, false],
              ["Current", () => chosen().after, true],
            ] as const
          }
        >
          {([title, name, isAfter]) => (
            <section>
              <h2>
                {title} · {name()}
              </h2>
              <div class="icon-review-heading">
                <span>Size</span>
                <For each={review.states}>
                  {(state) => <span>{state}</span>}
                </For>
              </div>
              <For each={review.sizes}>
                {(size) => (
                  <div class="icon-review-row">
                    <span>{size}px</span>
                    <For each={review.states}>
                      {(state) => sample(name, size, state, isAfter)}
                    </For>
                  </div>
                )}
              </For>
            </section>
          )}
        </For>
      </div>
      <p class="icon-review-note">
        Original Oasis vectors: MIT. Lucide comparison glyphs: ISC. Decorative
        icons are hidden from accessibility APIs; their action buttons retain
        names. This sheet evaluates artwork, not command semantics.
      </p>
    </main>
  );
}
render(() => <IconReview />, document.getElementById("icon-review-root")!);

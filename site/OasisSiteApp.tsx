import { For, Match, Show, Switch, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { OasisEditorApp } from "../src/ui/OasisEditorApp.js";
import type { OasisEditorAppProps } from "../src/ui/OasisEditorApp.js";

type RouteId = "editor" | "about" | "api" | "plugins";
type Language = "pt" | "en";

declare global {
  interface Window {
    __oasisEditorTestProps?: OasisEditorAppProps;
  }
}

const brandMarkUrl = "./branding/logo-full.png";
const brandFullUrl = "./branding/logo-full.png";

function IcoEditor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IcoAbout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function IcoApi() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m18 16 4-4-4-4" />
      <path d="m6 8-4 4 4 4" />
      <path d="m14.5 4-5 16" />
    </svg>
  );
}

function IcoPlugins() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const routes = [
  { id: "editor" as const, icon: IcoEditor },
  { id: "about" as const, icon: IcoAbout },
  { id: "api" as const, icon: IcoApi },
  { id: "plugins" as const, icon: IcoPlugins },
];

const routeLabels: Record<Language, Record<RouteId, string>> = {
  pt: {
    editor: "Oasis Editor",
    about: "Sobre",
    api: "API amigavel",
    plugins: "Criar plugin",
  },
  en: {
    editor: "Oasis Editor",
    about: "About",
    api: "Friendly API",
    plugins: "Create plugin",
  },
};

const copy = {
  pt: {
    product: "Oasis Editor",
    eyebrow: "Editor documental extensivel",
    headline: "Editor, docs e extensibilidade no mesmo lugar.",
    description:
      "A demo abre direto no editor, mas agora tambem apresenta o que torna o Oasis Editor diferente, como integrar a API e como criar plugins.",
    openNav: "Menu",
    closeNav: "Fechar menu",
    switchTo: "English",
    moreAbout: "Ver mais sobre o editor →",
    editor: {
      title: "Editor",
      subtitle:
        "A rota padrao preserva a experiencia atual: editor documental com shell docs, toolbar, menus e import/export.",
      tip: "Dica: use ?shell=inline ou ?shell=balloon para testar outros shells.",
    },
    about: {
      title: "Por que Oasis Editor",
      subtitle:
        "O foco e documento real, API composable e extensibilidade sem forkar a interface.",
      cards: [
        {
          title: "Document-centric",
          text: "Modelo pensado para paginas, secoes, tabelas, imagens, notas e layout de documento, nao apenas HTML rico.",
        },
        {
          title: "Shells de UI",
          text: "Use document, inline ou balloon shell conforme o produto precisa, mantendo o mesmo runtime.",
        },
        {
          title: "DOCX e PDF",
          text: "Importacao DOCX e exportacao DOCX/PDF fazem parte da proposta central do editor.",
        },
        {
          title: "Toolbar customizavel",
          text: "A toolbar e baseada em registry, permitindo adicionar, mover, substituir ou remover controles.",
        },
        {
          title: "Plugins por comandos",
          text: "Plugins contribuem comandos, toolbar, menubar e keymaps atraves de uma API declarativa.",
        },
        {
          title: "Paridade de layout",
          text: "O projeto prioriza comportamento de documento e fidelidade visual em vez de uma superficie generica.",
        },
      ],
    },
    api: {
      title: "API amigavel",
      subtitle:
        "Use o editor como app pronto, container sem chrome ou runtime customizado com plugins.",
      sections: [
        {
          title: "Montagem imperativa",
          text: "Ideal para integrar em qualquer pagina sem depender de framework.",
          code: `import { createOasisEditor } from "oasis-editor";
import "oasis-editor/style.css";

const instance = createOasisEditor(document.getElementById("editor")!, {
  ui: { shell: "document", uiVariant: "docs" },
  document: { persistenceEnabled: true },
});

instance.dispose();`,
        },
        {
          title: "Props principais",
          text: "A configuracao e dividida entre UI, documento e runtime.",
          code: `type OasisEditorAppProps = {
  ui?: {
    shell?: "document" | "inline" | "balloon";
    uiVariant?: "classic" | "docs";
    locale?: "pt-BR" | "en";
  };
  document?: {
    readOnly?: boolean;
    initialDocument?: EditorDocument;
    onStateChange?: (state: EditorState) => void;
  };
  runtime?: {
    plugins?: OasisPlugin[];
    customizeToolbar?: (registry: ToolbarRegistry) => void;
  };
};`,
        },
        {
          title: "Container sem chrome",
          text: "Quando o produto ja tem toolbar ou chrome proprio, use o container.",
          code: `import { OasisEditorContainer } from "oasis-editor";

<OasisEditorContainer
  ui={{ viewportHeight: "72vh" }}
  runtime={{ plugins: [TimestampPlugin] }}
/>;`,
        },
      ],
    },
    plugins: {
      title: "Como criar um plugin",
      subtitle:
        "Um plugin registra comandos e declara onde eles aparecem. O runtime cuida da integracao.",
      steps: [
        "Defina um objeto OasisPlugin com name unico.",
        "Registre comandos em commands e retorne CommandState em refresh.",
        "Conecte comandos a toolbar, menubar ou keymaps.",
        "Passe o plugin em runtime.plugins ao montar o editor.",
      ],
      code: `import type { OasisPlugin } from "oasis-editor";

export const TimestampPlugin: OasisPlugin = {
  name: "Timestamp",
  commands: {
    insertTimestamp: {
      execute: () => new Date().toISOString(),
      refresh: () => ({ isEnabled: true }),
    },
  },
  toolbar: [
    {
      id: "insertTimestamp",
      command: "insertTimestamp",
      group: "insert",
      icon: "clock-3",
    },
  ],
  menubar: [
    {
      id: "insert_timestamp",
      path: "Insert/Timestamp",
      command: "insertTimestamp",
      shortcut: "Ctrl+Alt+T",
    },
  ],
  keymaps: [{ key: "Ctrl+Alt+T", command: "insertTimestamp" }],
};`,
      hooks:
        "Use init, afterInit, install e destroy quando o plugin precisar preparar estado, ouvir eventos ou limpar recursos.",
      usage: `createOasisEditor(root, {
  runtime: {
    plugins: [TimestampPlugin],
  },
});`,
    },
  },
  en: {
    product: "Oasis Editor",
    eyebrow: "Extensible document editor",
    headline: "Editor, docs, and extensibility in one place.",
    description:
      "The demo still opens in the editor, but now also explains what makes Oasis Editor different, how to use the API, and how to create plugins.",
    openNav: "Menu",
    closeNav: "Close menu",
    switchTo: "Português",
    moreAbout: "Learn more about the editor →",
    editor: {
      title: "Editor",
      subtitle:
        "The default route preserves the current experience: document editor with docs shell, toolbar, menus, and import/export.",
      tip: "Tip: use ?shell=inline or ?shell=balloon to test other shells.",
    },
    about: {
      title: "Why Oasis Editor",
      subtitle:
        "The focus is real documents, composable APIs, and extensibility without forking the interface.",
      cards: [
        {
          title: "Document-centric",
          text: "A model designed for pages, sections, tables, images, footnotes, and document layout, not only rich HTML.",
        },
        {
          title: "UI shells",
          text: "Use document, inline, or balloon shell depending on product needs while keeping the same runtime.",
        },
        {
          title: "DOCX and PDF",
          text: "DOCX import and DOCX/PDF export are part of the editor's core direction.",
        },
        {
          title: "Custom toolbar",
          text: "The toolbar is registry-driven, so products can add, move, replace, or remove controls.",
        },
        {
          title: "Command plugins",
          text: "Plugins contribute commands, toolbar items, menubar items, and keymaps through a declarative API.",
        },
        {
          title: "Layout parity",
          text: "The project prioritizes document behavior and visual fidelity over a generic editing surface.",
        },
      ],
    },
    api: {
      title: "Friendly API",
      subtitle:
        "Use the editor as a ready-made app, a chromeless container, or a customized runtime with plugins.",
      sections: [
        {
          title: "Imperative mount",
          text: "Useful when integrating into any page without coupling to a framework.",
          code: `import { createOasisEditor } from "oasis-editor";
import "oasis-editor/style.css";

const instance = createOasisEditor(document.getElementById("editor")!, {
  ui: { shell: "document", uiVariant: "docs" },
  document: { persistenceEnabled: true },
});

instance.dispose();`,
        },
        {
          title: "Main props",
          text: "Configuration is split between UI, document, and runtime.",
          code: `type OasisEditorAppProps = {
  ui?: {
    shell?: "document" | "inline" | "balloon";
    uiVariant?: "classic" | "docs";
    locale?: "pt-BR" | "en";
  };
  document?: {
    readOnly?: boolean;
    initialDocument?: EditorDocument;
    onStateChange?: (state: EditorState) => void;
  };
  runtime?: {
    plugins?: OasisPlugin[];
    customizeToolbar?: (registry: ToolbarRegistry) => void;
  };
};`,
        },
        {
          title: "Chromeless container",
          text: "When your product already owns the toolbar or chrome, use the container.",
          code: `import { OasisEditorContainer } from "oasis-editor";

<OasisEditorContainer
  ui={{ viewportHeight: "72vh" }}
  runtime={{ plugins: [TimestampPlugin] }}
/>;`,
        },
      ],
    },
    plugins: {
      title: "How to create a plugin",
      subtitle:
        "A plugin registers commands and declares where they appear. The runtime handles integration.",
      steps: [
        "Define an OasisPlugin object with a unique name.",
        "Register commands in commands and return CommandState in refresh.",
        "Connect commands to toolbar, menubar, or keymaps.",
        "Pass the plugin through runtime.plugins when mounting the editor.",
      ],
      code: `import type { OasisPlugin } from "oasis-editor";

export const TimestampPlugin: OasisPlugin = {
  name: "Timestamp",
  commands: {
    insertTimestamp: {
      execute: () => new Date().toISOString(),
      refresh: () => ({ isEnabled: true }),
    },
  },
  toolbar: [
    {
      id: "insertTimestamp",
      command: "insertTimestamp",
      group: "insert",
      icon: "clock-3",
    },
  ],
  menubar: [
    {
      id: "insert_timestamp",
      path: "Insert/Timestamp",
      command: "insertTimestamp",
      shortcut: "Ctrl+Alt+T",
    },
  ],
  keymaps: [{ key: "Ctrl+Alt+T", command: "insertTimestamp" }],
};`,
      hooks:
        "Use init, afterInit, install, and destroy when the plugin needs to prepare state, listen to events, or clean up resources.",
      usage: `createOasisEditor(root, {
  runtime: {
    plugins: [TimestampPlugin],
  },
});`,
    },
  },
};

function getHashRoute(): RouteId {
  const route = window.location.hash.replace(/^#\/?/, "");
  return routes.some((item) => item.id === route) ? (route as RouteId) : "editor";
}

function getRequestedShell() {
  const params = new URLSearchParams(window.location.search);
  const requestedShell = params.get("shell");
  return requestedShell === "inline" || requestedShell === "balloon" ? requestedShell : "document";
}

function loadLanguage(): Language {
  const stored = window.localStorage.getItem("oasis-site-language");
  return stored === "en" ? "en" : "pt";
}

export function OasisSiteApp() {
  const [activeRoute, setActiveRoute] = createSignal<RouteId>(getHashRoute());
  const [language, setLanguage] = createSignal<Language>(loadLanguage());
  const [navOpen, setNavOpen] = createSignal(false);
  const text = createMemo(() => copy[language()]);

  const syncRoute = () => {
    setActiveRoute(getHashRoute());
    setNavOpen(false);
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/editor");
    }
  };

  const toggleLanguage = () => {
    const next: Language = language() === "pt" ? "en" : "pt";
    setLanguage(next);
    window.localStorage.setItem("oasis-site-language", next);
  };

  onMount(() => {
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
  });

  onCleanup(() => {
    window.removeEventListener("hashchange", syncRoute);
  });

  return (
    <div classList={{ "oasis-site": true, "oasis-site-nav-open": navOpen() }}>
      <Show when={navOpen()}>
        <button
          class="oasis-site-scrim"
          type="button"
          aria-label={text().closeNav}
          onClick={() => setNavOpen(false)}
        />
      </Show>

      <div class="oasis-site-rail">
        <div class="oasis-site-rail-inner">
          <div class="oasis-site-brand">
            <img class="oasis-site-brand-mark" src={brandMarkUrl} alt="" />
            <span class="oasis-site-brand-name">{text().product}</span>
          </div>

          <nav class="oasis-site-nav" aria-label="Oasis Editor">
            <For each={routes}>
              {(route) => (
                <a
                  classList={{
                    "oasis-site-nav-item": true,
                    "oasis-site-nav-item-active": activeRoute() === route.id,
                  }}
                  href={`#/${route.id}`}
                  title={routeLabels[language()][route.id]}
                >
                  <span class="oasis-site-nav-ico">{route.icon()}</span>
                  <span class="oasis-site-nav-label">{routeLabels[language()][route.id]}</span>
                </a>
              )}
            </For>
          </nav>

          <button
            class="oasis-site-lang"
            type="button"
            aria-label={`${text().product}: ${text().switchTo}`}
            onClick={toggleLanguage}
          >
            <span class="oasis-site-lang-ico">{language() === "pt" ? "PT" : "EN"}</span>
            <span class="oasis-site-lang-text">{text().switchTo}</span>
          </button>
        </div>
      </div>

      <main class="oasis-site-main">
        <div class="oasis-site-strip">
          <button
            class="oasis-site-menu-btn"
            type="button"
            aria-label={text().openNav}
            onClick={() => setNavOpen(true)}
          >
            <span aria-hidden="true" />
          </button>
          <span class="oasis-site-strip-title">{routeLabels[language()][activeRoute()]}</span>
        </div>

        <Switch>
          <Match when={activeRoute() === "editor"}>
            <EditorPage language={language()} />
          </Match>
          <Match when={activeRoute() === "about"}>
            <AboutPage language={language()} />
          </Match>
          <Match when={activeRoute() === "api"}>
            <ApiPage language={language()} />
          </Match>
          <Match when={activeRoute() === "plugins"}>
            <PluginsPage language={language()} />
          </Match>
        </Switch>
      </main>
    </div>
  );
}

function EditorPage(props: { language: Language }) {
  const t = () => copy[props.language];
  const testProps = () => window.__oasisEditorTestProps ?? {};

  return (
    <div class="oasis-site-content oasis-site-editor-split">
      <aside class="oasis-site-editor-info">
        <img class="oasis-site-editor-brand" src={brandFullUrl} alt="Oasis Editor" />
        <p class="oasis-site-eyebrow">{t().eyebrow}</p>
        <h2 class="oasis-site-editor-headline">{t().headline}</h2>
        <p class="oasis-site-lead">{t().description}</p>
        <a class="oasis-site-more-link" href="#/about">{t().moreAbout}</a>
        <div class="oasis-site-tip">
          <span class="oasis-site-tip-dot" aria-hidden="true" />
          <span>{t().editor.tip}</span>
        </div>
      </aside>
      <div class="oasis-site-editor-col">
        <div class="oasis-site-editor-host">
          <OasisEditorApp
            ui={{
              ...testProps().ui,
              shell: getRequestedShell(),
              uiVariant: "docs",
              locale: props.language === "pt" ? "pt-BR" : "en",
            }}
            document={testProps().document}
            runtime={testProps().runtime}
          />
        </div>
      </div>
    </div>
  );
}

function AboutPage(props: { language: Language }) {
  const t = () => copy[props.language];
  const about = () => t().about;

  return (
    <div class="oasis-site-content is-doc">
      <div class="oasis-site-doc">
        <header class="oasis-site-hero">
          <img class="oasis-site-hero-mark" src={brandMarkUrl} alt="" />
          <h1>{t().headline}</h1>
          <p>{t().description}</p>
        </header>

        <h2 class="oasis-site-section">{about().title}</h2>
        <p class="oasis-site-section-sub">{about().subtitle}</p>

        <div class="oasis-site-cards">
          <For each={about().cards}>
            {(card) => (
              <article class="oasis-site-card">
                <span class="oasis-site-card-ico" aria-hidden="true">
                  {card.title.charAt(0)}
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

function ApiPage(props: { language: Language }) {
  const api = () => copy[props.language].api;

  return (
    <div class="oasis-site-content is-doc">
      <div class="oasis-site-doc">
        <header class="oasis-site-hero">
          <img class="oasis-site-hero-mark" src={brandMarkUrl} alt="" />
          <h1>{api().title}</h1>
          <p>{api().subtitle}</p>
        </header>

        <div class="oasis-site-stack">
          <For each={api().sections}>
            {(section) => (
              <article class="oasis-site-panel">
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </div>
                <pre>
                  <code>{section.code}</code>
                </pre>
              </article>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

function PluginsPage(props: { language: Language }) {
  const plugins = () => copy[props.language].plugins;

  return (
    <div class="oasis-site-content is-doc">
      <div class="oasis-site-doc">
        <header class="oasis-site-hero">
          <img class="oasis-site-hero-mark" src={brandMarkUrl} alt="" />
          <h1>{plugins().title}</h1>
          <p>{plugins().subtitle}</p>
        </header>

        <div class="oasis-site-plugin">
          <article class="oasis-site-steps">
            <For each={plugins().steps}>
              {(step, index) => (
                <div class="oasis-site-step">
                  <b>{index() + 1}</b>
                  <span>{step}</span>
                </div>
              )}
            </For>
            <p>{plugins().hooks}</p>
            <pre>
              <code>{plugins().usage}</code>
            </pre>
          </article>
          <pre>
            <code>{plugins().code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

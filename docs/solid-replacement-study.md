# Estudo de Substituição do SolidJS no Oasis Editor

Este documento detalha o uso atual do SolidJS no Oasis Editor e explora a possibilidade de substituí-lo por uma implementação própria, visando maior controle sobre o ciclo de vida e redução de dependências externas.

## 1. Análise do Uso Atual do SolidJS

O SolidJS não é apenas uma biblioteca de UI para o projeto; ele é o motor de reatividade que sustenta tanto a interface quanto a lógica de estado do editor.

### 1.1 Reatividade Core
A reatividade do Solid é usada extensivamente através de:
- **`createSignal`**: Gerenciamento de estados atômicos (ex: visibilidade de diálogos, estado de foco, inputs de texto).
- **`createMemo`**: Cálculos derivados que só re-executam quando as dependências mudam (ex: filtragem de itens da toolbar, projeção de layouts).
- **`createEffect`**: Sincronização de estado com APIs externas ou DOM manual (ex: persistência em IndexedDB, atualização de geometria do cursor).
- **`createStore`**: Estado complexo e aninhado no `src/core/Editor.ts`, permitindo atualizações granulares sem recriar objetos inteiros.

### 1.2 Componentes e Controle de Fluxo
A UI utiliza os componentes utilitários do Solid para otimização:
- **`<Show>`**: Condicionais que montam/desmontam partes do DOM de forma eficiente.
- **`<For>`**: Reconciliação de listas (toolbar, tabs, itens de menu).
- **`<Portal>`**: Essencial para diálogos e toolbars flutuantes que precisam sair do contexto de overflow do editor.
- **`<Dynamic>`**: Usado em renderizadores de itens de toolbar para alternar entre diferentes tipos de componentes dinamicamente.

### 1.3 Integração com o Editor
O `src/ui/mount.tsx` expõe uma função `mount` que encapsula o SolidJS, permitindo que o editor seja usado em ambientes Vanilla JS, React ou Vue sem expor a dependência interna.

---

## 2. Proposta de Implementação Própria ("Oasis Reactive")

Para substituir o SolidJS, precisaríamos implementar três pilares: Reatividade, Renderer e Componentes de Controle.

### 2.1 Core de Reatividade (Signals)
Poderíamos implementar um sistema de signals minimalista baseado no padrão de "tracking" automático.

**Possibilidade de implementação:**
```typescript
let context: any[] = [];

export function createSignal<T>(value: T) {
  const subscriptions = new Set<any>();
  return [
    () => {
      const running = context[context.length - 1];
      if (running) subscriptions.add(running);
      return value;
    },
    (nextValue: T) => {
      value = nextValue;
      for (const sub of subscriptions) sub.execute();
    }
  ] as const;
}

export function createEffect(fn: () => void) {
  const effect = {
    execute() {
      context.push(this);
      try { fn(); } finally { context.pop(); }
    }
  };
  effect.execute();
}
```

### 2.2 Gerenciamento de Store (Proxies)
O uso de `createStore` no core exige um sistema baseado em Proxies que suporte mutações granulares. Uma implementação interna usaria `Proxy` para interceptar `set` e notificar assinantes em níveis específicos da árvore de objetos.

### 2.3 Renderer (JSX -> DOM)
SolidJS usa um compilador que transforma JSX em comandos DOM eficientes. Para uma implementação nossa, teríamos duas rotas:
1. **Compilador Próprio:** Criar um plugin de Vite/Babel que transforma JSX em algo como `element.setAttribute(...)`. (Complexidade Alta).
2. **Runtime Hyperscript:** Usar uma função `h(tag, props, ...children)` que cria elementos DOM e configura bindings reativos se uma prop for um signal. (Complexidade Média).

---

## 3. Estratégia de Transição

Se decidirmos prosseguir com a substituição, a migração deve ser faseada:

| Fase | Descrição | Objetivo |
| :--- | :--- | :--- |
| **Fase 1: Core** | Implementar `createSignal`, `createMemo`, `createEffect`. | Substituir a reatividade "invisível" (controllers e core). |
| **Fase 2: Store** | Implementar `createStore` com suporte a proxies. | Desvincular o `src/core/Editor.ts` do SolidJS. |
| **Fase 3: Renderer** | Definir a função `h` e configurar o `jsxImportSource`. | Permitir a escrita de componentes sem SolidJS. |
| **Fase 4: Bridge** | Implementar `<Show>`, `<For>` e `<Portal>` nativos. | Compatibilizar os componentes de UI existentes. |

---

## 4. Conclusão

### Por que substituir?
- **Controle Total:** Otimizar o sistema de reatividade especificamente para as necessidades de um editor de texto (muitos updates pequenos e frequentes).
- **Bundle Size:** Remover os ~7KB-10KB do SolidJS (embora já seja pequeno, para um editor embedded cada byte conta).
- **Independência:** Evitar que mudanças futuras no SolidJS quebrem a arquitetura core do editor.

### Por que manter o SolidJS?
- **Maturidade:** O sistema de reatividade do Solid é extremamente performático e testado em batalha.
- **Ecossistema:** Ferramentas como o `solid-devtools` são valiosas para depurar a UI.
- **Custo de Manutenção:** Implementar um framework próprio significa assumir a manutenção de bugs de rendering e reatividade que o Solid já resolveu.

A substituição é viável tecnicamente, especialmente se focarmos em um sistema de reatividade minimalista e um renderer baseado em runtime (hyperscript), abrindo mão da compilação ultra-otimizada do Solid em favor de simplicidade e controle.

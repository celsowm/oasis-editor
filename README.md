# oasis-editor

Base refatorada para manter uma identidade única, sem legado paralelo, com responsabilidades mais claras e caminho limpo para evolução.

## O que foi limpo

- nome da aplicação consolidado como `oasis-editor`
- remoção de qualquer entrypoint paralelo de legacy
- view desacoplada do catálogo de templates do core
- composição de dependências via bootstrap
- presenter dedicado para transformar estado em view model
- layout isolado em serviço específico

## Onde os princípios aparecem

### Single Responsibility
- `DocumentRuntime` controla estado e histórico
- `DocumentLayoutService` compõe layout
- `OasisEditorPresenter` monta o view model
- `OasisEditorView` só lida com DOM
- `OasisEditorController` orquestra os fluxos

### Open/Closed
- o catálogo de templates pode crescer sem alterar a view
- novos presenters e adapters podem entrar sem reescrever o app inteiro

### Liskov / Interface Segregation
- `TextMeasurementBridge` continua isolando a medição
- `RustCompositionAdapter` segue como fronteira para trocar o backend depois

### Dependency Inversion
- o app nasce em `createOasisEditorApp`
- controller depende de colaborares injetados, não de construções escondidas

## Estrutura principal

```text
src/
  app/
    bootstrap/
    dom/
    presenters/
    services/
    OasisEditorController.js
    OasisEditorView.js
  core/
    document/
    selection/
    operations/
    runtime/
    pages/
    layout/
    composition/
    pagination/
  bridge/
    measurement/
  ui/
    pages/
    selection/
  engine/
    adapters/
```

## Como rodar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

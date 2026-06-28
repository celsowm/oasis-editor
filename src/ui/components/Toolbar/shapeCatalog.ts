import type { Locale } from "@/i18n/index.js";
import type { TranslationKey } from "@/i18n/index.js";

/** One Word-style section of the shapes gallery. */
export interface ShapeCategory {
  /** i18n key for the section header. */
  headerKey: TranslationKey;
  /** DrawingML preset names (all present in the preset-geometry catalog). */
  presets: string[];
}

/**
 * Ordered shape categories mirroring Word's "Formas" gallery. Every preset
 * listed here is supported by `getPresetPathSegments` (see
 * `src/layoutProjection/presetGeometry/catalog.ts`), so each renders as an
 * outline thumbnail and inserts via the existing `insertShape` command.
 */
export const SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    headerKey: "toolbar.shapes.lines",
    presets: [
      "line",
      "lineInv",
      "straightConnector1",
      "bentConnector3",
      "curvedConnector3",
    ],
  },
  {
    headerKey: "toolbar.shapes.rectangles",
    presets: [
      "rect",
      "roundRect",
      "snip1Rect",
      "snip2SameRect",
      "snip2DiagRect",
      "snipRoundRect",
      "round1Rect",
      "round2SameRect",
      "round2DiagRect",
      "plaque",
    ],
  },
  {
    headerKey: "toolbar.shapes.basicShapes",
    presets: [
      "ellipse",
      "triangle",
      "rtTriangle",
      "parallelogram",
      "trapezoid",
      "diamond",
      "pentagon",
      "hexagon",
      "heptagon",
      "octagon",
      "decagon",
      "dodecagon",
      "pie",
      "chord",
      "teardrop",
      "frame",
      "halfFrame",
      "corner",
      "diagStripe",
      "plus",
      "bevel",
      "arc",
      "leftBracket",
      "rightBracket",
      "leftBrace",
      "rightBrace",
      "cube",
      "can",
      "lightningBolt",
      "heart",
      "sun",
      "moon",
      "cloud",
      "smileyFace",
      "noSmoking",
      "blockArc",
      "foldedCorner",
      "donut",
    ],
  },
  {
    headerKey: "toolbar.shapes.blockArrows",
    presets: [
      "rightArrow",
      "leftArrow",
      "upArrow",
      "downArrow",
      "leftRightArrow",
      "upDownArrow",
      "quadArrow",
      "leftRightUpArrow",
      "bentArrow",
      "uturnArrow",
      "leftUpArrow",
      "bentUpArrow",
      "curvedRightArrow",
      "curvedLeftArrow",
      "curvedUpArrow",
      "curvedDownArrow",
      "stripedRightArrow",
      "notchedRightArrow",
      "homePlate",
      "chevron",
      "rightArrowCallout",
      "downArrowCallout",
      "upArrowCallout",
      "leftArrowCallout",
      "leftRightArrowCallout",
      "quadArrowCallout",
      "circularArrow",
    ],
  },
  {
    headerKey: "toolbar.shapes.equation",
    presets: [
      "mathPlus",
      "mathMinus",
      "mathMultiply",
      "mathDivide",
      "mathEqual",
      "mathNotEqual",
    ],
  },
  {
    headerKey: "toolbar.shapes.flowchart",
    presets: [
      "flowChartProcess",
      "flowChartAlternateProcess",
      "flowChartDecision",
      "flowChartInputOutput",
      "flowChartPredefinedProcess",
      "flowChartInternalStorage",
      "flowChartDocument",
      "flowChartMultidocument",
      "flowChartTerminator",
      "flowChartPreparation",
      "flowChartManualInput",
      "flowChartManualOperation",
      "flowChartConnector",
      "flowChartOffpageConnector",
      "flowChartPunchedCard",
      "flowChartPunchedTape",
      "flowChartSummingJunction",
      "flowChartOr",
      "flowChartCollate",
      "flowChartSort",
      "flowChartExtract",
      "flowChartMerge",
      "flowChartOnlineStorage",
      "flowChartMagneticDisk",
      "flowChartMagneticDrum",
      "flowChartMagneticTape",
      "flowChartDisplay",
      "flowChartDelay",
    ],
  },
  {
    headerKey: "toolbar.shapes.starsAndBanners",
    presets: [
      "star4",
      "star5",
      "star6",
      "star7",
      "star8",
      "star10",
      "star12",
      "star16",
      "star24",
      "star32",
      "irregularSeal1",
      "irregularSeal2",
      "ribbon",
      "ribbon2",
      "ellipseRibbon",
      "ellipseRibbon2",
      "verticalScroll",
      "horizontalScroll",
      "wave",
      "doubleWave",
    ],
  },
  {
    headerKey: "toolbar.shapes.callouts",
    presets: [
      "wedgeRectCallout",
      "wedgeRoundRectCallout",
      "wedgeEllipseCallout",
      "cloudCallout",
      "borderCallout1",
      "borderCallout2",
      "borderCallout3",
      "accentCallout1",
      "accentCallout2",
      "accentCallout3",
      "callout1",
      "callout2",
      "callout3",
      "accentBorderCallout1",
      "accentBorderCallout2",
      "accentBorderCallout3",
    ],
  },
];

/**
 * Presets rendered as open strokes (no closed fill) in thumbnails — lines and
 * connectors. Visual only; insertion is unchanged.
 */
export const STROKE_ONLY_PRESETS = new Set<string>([
  "line",
  "lineInv",
  "straightConnector1",
  "bentConnector2",
  "bentConnector3",
  "bentConnector4",
  "bentConnector5",
  "curvedConnector2",
  "curvedConnector3",
  "curvedConnector4",
  "curvedConnector5",
  "arc",
]);

/**
 * Bilingual display names for shape tooltips. Kept here (rather than as ~150
 * typed i18n keys) to avoid bloating the `TranslationKey` union. Falls back to
 * the raw preset name when missing.
 */
const SHAPE_LABELS: Record<string, Record<Locale, string>> = {
  // Lines
  line: { "pt-BR": "Linha", en: "Line" },
  lineInv: { "pt-BR": "Linha (invertida)", en: "Line (inverse)" },
  straightConnector1: { "pt-BR": "Conector reto", en: "Straight connector" },
  bentConnector3: { "pt-BR": "Conector em cotovelo", en: "Elbow connector" },
  curvedConnector3: { "pt-BR": "Conector curvo", en: "Curved connector" },
  // Rectangles
  rect: { "pt-BR": "Retângulo", en: "Rectangle" },
  roundRect: { "pt-BR": "Retângulo arredondado", en: "Rounded rectangle" },
  snip1Rect: {
    "pt-BR": "Retângulo de canto recortado",
    en: "Snip single corner rectangle",
  },
  snip2SameRect: {
    "pt-BR": "Retângulo de cantos recortados (mesmo lado)",
    en: "Snip same side corner rectangle",
  },
  snip2DiagRect: {
    "pt-BR": "Retângulo de cantos recortados (diagonal)",
    en: "Snip diagonal corner rectangle",
  },
  snipRoundRect: {
    "pt-BR": "Retângulo recortado e arredondado",
    en: "Snip and round single corner rectangle",
  },
  round1Rect: {
    "pt-BR": "Retângulo de canto arredondado",
    en: "Round single corner rectangle",
  },
  round2SameRect: {
    "pt-BR": "Retângulo de cantos arredondados (mesmo lado)",
    en: "Round same side corner rectangle",
  },
  round2DiagRect: {
    "pt-BR": "Retângulo de cantos arredondados (diagonal)",
    en: "Round diagonal corner rectangle",
  },
  plaque: { "pt-BR": "Placa", en: "Plaque" },
  // Basic shapes
  ellipse: { "pt-BR": "Elipse", en: "Oval" },
  triangle: { "pt-BR": "Triângulo isósceles", en: "Isosceles triangle" },
  rtTriangle: { "pt-BR": "Triângulo retângulo", en: "Right triangle" },
  parallelogram: { "pt-BR": "Paralelogramo", en: "Parallelogram" },
  trapezoid: { "pt-BR": "Trapézio", en: "Trapezoid" },
  diamond: { "pt-BR": "Losango", en: "Diamond" },
  pentagon: { "pt-BR": "Pentágono", en: "Pentagon" },
  hexagon: { "pt-BR": "Hexágono", en: "Hexagon" },
  heptagon: { "pt-BR": "Heptágono", en: "Heptagon" },
  octagon: { "pt-BR": "Octógono", en: "Octagon" },
  decagon: { "pt-BR": "Decágono", en: "Decagon" },
  dodecagon: { "pt-BR": "Dodecágono", en: "Dodecagon" },
  pie: { "pt-BR": "Gráfico de pizza", en: "Pie" },
  chord: { "pt-BR": "Corda", en: "Chord" },
  teardrop: { "pt-BR": "Lágrima", en: "Teardrop" },
  frame: { "pt-BR": "Moldura", en: "Frame" },
  halfFrame: { "pt-BR": "Meia moldura", en: "Half frame" },
  corner: { "pt-BR": "Canto", en: "Corner" },
  diagStripe: { "pt-BR": "Faixa diagonal", en: "Diagonal stripe" },
  plus: { "pt-BR": "Mais", en: "Plus" },
  bevel: { "pt-BR": "Bisel", en: "Bevel" },
  arc: { "pt-BR": "Arco", en: "Arc" },
  leftBracket: { "pt-BR": "Colchete esquerdo", en: "Left bracket" },
  rightBracket: { "pt-BR": "Colchete direito", en: "Right bracket" },
  leftBrace: { "pt-BR": "Chave esquerda", en: "Left brace" },
  rightBrace: { "pt-BR": "Chave direita", en: "Right brace" },
  cube: { "pt-BR": "Cubo", en: "Cube" },
  can: { "pt-BR": "Cilindro", en: "Can" },
  lightningBolt: { "pt-BR": "Raio", en: "Lightning bolt" },
  heart: { "pt-BR": "Coração", en: "Heart" },
  sun: { "pt-BR": "Sol", en: "Sun" },
  moon: { "pt-BR": "Lua", en: "Moon" },
  cloud: { "pt-BR": "Nuvem", en: "Cloud" },
  smileyFace: { "pt-BR": "Rosto sorridente", en: "Smiley face" },
  noSmoking: { "pt-BR": "Proibido", en: '"No" symbol' },
  blockArc: { "pt-BR": "Arco em bloco", en: "Block arc" },
  foldedCorner: { "pt-BR": "Canto dobrado", en: "Folded corner" },
  donut: { "pt-BR": "Anel", en: "Donut" },
  // Block arrows
  rightArrow: { "pt-BR": "Seta para a direita", en: "Right arrow" },
  leftArrow: { "pt-BR": "Seta para a esquerda", en: "Left arrow" },
  upArrow: { "pt-BR": "Seta para cima", en: "Up arrow" },
  downArrow: { "pt-BR": "Seta para baixo", en: "Down arrow" },
  leftRightArrow: { "pt-BR": "Seta dupla horizontal", en: "Left-right arrow" },
  upDownArrow: { "pt-BR": "Seta dupla vertical", en: "Up-down arrow" },
  quadArrow: { "pt-BR": "Seta quádrupla", en: "Quad arrow" },
  leftRightUpArrow: {
    "pt-BR": "Seta esquerda-direita-cima",
    en: "Left-right-up arrow",
  },
  bentArrow: { "pt-BR": "Seta dobrada", en: "Bent arrow" },
  uturnArrow: { "pt-BR": "Seta em U", en: "U-turn arrow" },
  leftUpArrow: { "pt-BR": "Seta esquerda-cima", en: "Left-up arrow" },
  bentUpArrow: { "pt-BR": "Seta dobrada para cima", en: "Bent-up arrow" },
  curvedRightArrow: {
    "pt-BR": "Seta curva para a direita",
    en: "Curved right arrow",
  },
  curvedLeftArrow: {
    "pt-BR": "Seta curva para a esquerda",
    en: "Curved left arrow",
  },
  curvedUpArrow: { "pt-BR": "Seta curva para cima", en: "Curved up arrow" },
  curvedDownArrow: {
    "pt-BR": "Seta curva para baixo",
    en: "Curved down arrow",
  },
  stripedRightArrow: {
    "pt-BR": "Seta listrada para a direita",
    en: "Striped right arrow",
  },
  notchedRightArrow: {
    "pt-BR": "Seta entalhada para a direita",
    en: "Notched right arrow",
  },
  homePlate: { "pt-BR": "Pentágono (seta)", en: "Pentagon" },
  chevron: { "pt-BR": "Divisa", en: "Chevron" },
  rightArrowCallout: {
    "pt-BR": "Texto explicativo de seta à direita",
    en: "Right arrow callout",
  },
  downArrowCallout: {
    "pt-BR": "Texto explicativo de seta abaixo",
    en: "Down arrow callout",
  },
  upArrowCallout: {
    "pt-BR": "Texto explicativo de seta acima",
    en: "Up arrow callout",
  },
  leftArrowCallout: {
    "pt-BR": "Texto explicativo de seta à esquerda",
    en: "Left arrow callout",
  },
  leftRightArrowCallout: {
    "pt-BR": "Texto explicativo de seta horizontal",
    en: "Left-right arrow callout",
  },
  quadArrowCallout: {
    "pt-BR": "Texto explicativo de seta quádrupla",
    en: "Quad arrow callout",
  },
  circularArrow: { "pt-BR": "Seta circular", en: "Circular arrow" },
  // Equation
  mathPlus: { "pt-BR": "Mais", en: "Plus" },
  mathMinus: { "pt-BR": "Menos", en: "Minus" },
  mathMultiply: { "pt-BR": "Multiplicação", en: "Multiply" },
  mathDivide: { "pt-BR": "Divisão", en: "Divide" },
  mathEqual: { "pt-BR": "Igual", en: "Equal" },
  mathNotEqual: { "pt-BR": "Diferente", en: "Not equal" },
  // Flowchart
  flowChartProcess: { "pt-BR": "Processo", en: "Process" },
  flowChartAlternateProcess: {
    "pt-BR": "Processo alternativo",
    en: "Alternate process",
  },
  flowChartDecision: { "pt-BR": "Decisão", en: "Decision" },
  flowChartInputOutput: { "pt-BR": "Dados", en: "Data" },
  flowChartPredefinedProcess: {
    "pt-BR": "Processo predefinido",
    en: "Predefined process",
  },
  flowChartInternalStorage: {
    "pt-BR": "Armazenamento interno",
    en: "Internal storage",
  },
  flowChartDocument: { "pt-BR": "Documento", en: "Document" },
  flowChartMultidocument: { "pt-BR": "Multidocumento", en: "Multidocument" },
  flowChartTerminator: { "pt-BR": "Terminador", en: "Terminator" },
  flowChartPreparation: { "pt-BR": "Preparação", en: "Preparation" },
  flowChartManualInput: { "pt-BR": "Entrada manual", en: "Manual input" },
  flowChartManualOperation: {
    "pt-BR": "Operação manual",
    en: "Manual operation",
  },
  flowChartConnector: { "pt-BR": "Conector", en: "Connector" },
  flowChartOffpageConnector: {
    "pt-BR": "Conector de outra página",
    en: "Off-page connector",
  },
  flowChartPunchedCard: { "pt-BR": "Cartão", en: "Card" },
  flowChartPunchedTape: { "pt-BR": "Fita perfurada", en: "Punched tape" },
  flowChartSummingJunction: {
    "pt-BR": "Junção de soma",
    en: "Summing junction",
  },
  flowChartOr: { "pt-BR": "Ou", en: "Or" },
  flowChartCollate: { "pt-BR": "Agrupar", en: "Collate" },
  flowChartSort: { "pt-BR": "Classificar", en: "Sort" },
  flowChartExtract: { "pt-BR": "Extrair", en: "Extract" },
  flowChartMerge: { "pt-BR": "Mesclar", en: "Merge" },
  flowChartOnlineStorage: {
    "pt-BR": "Armazenamento on-line",
    en: "Stored data",
  },
  flowChartMagneticDisk: { "pt-BR": "Disco magnético", en: "Magnetic disk" },
  flowChartMagneticDrum: {
    "pt-BR": "Cilindro magnético",
    en: "Direct access storage",
  },
  flowChartMagneticTape: {
    "pt-BR": "Fita magnética",
    en: "Sequential access storage",
  },
  flowChartDisplay: { "pt-BR": "Exibir", en: "Display" },
  flowChartDelay: { "pt-BR": "Atraso", en: "Delay" },
  // Stars and banners
  star4: { "pt-BR": "Estrela de 4 pontas", en: "4-point star" },
  star5: { "pt-BR": "Estrela de 5 pontas", en: "5-point star" },
  star6: { "pt-BR": "Estrela de 6 pontas", en: "6-point star" },
  star7: { "pt-BR": "Estrela de 7 pontas", en: "7-point star" },
  star8: { "pt-BR": "Estrela de 8 pontas", en: "8-point star" },
  star10: { "pt-BR": "Estrela de 10 pontas", en: "10-point star" },
  star12: { "pt-BR": "Estrela de 12 pontas", en: "12-point star" },
  star16: { "pt-BR": "Estrela de 16 pontas", en: "16-point star" },
  star24: { "pt-BR": "Estrela de 24 pontas", en: "24-point star" },
  star32: { "pt-BR": "Estrela de 32 pontas", en: "32-point star" },
  irregularSeal1: { "pt-BR": "Explosão 1", en: "Explosion 1" },
  irregularSeal2: { "pt-BR": "Explosão 2", en: "Explosion 2" },
  ribbon: { "pt-BR": "Faixa para baixo", en: "Down ribbon" },
  ribbon2: { "pt-BR": "Faixa para cima", en: "Up ribbon" },
  ellipseRibbon: {
    "pt-BR": "Faixa curva para baixo",
    en: "Curved down ribbon",
  },
  ellipseRibbon2: { "pt-BR": "Faixa curva para cima", en: "Curved up ribbon" },
  verticalScroll: { "pt-BR": "Pergaminho vertical", en: "Vertical scroll" },
  horizontalScroll: {
    "pt-BR": "Pergaminho horizontal",
    en: "Horizontal scroll",
  },
  wave: { "pt-BR": "Onda", en: "Wave" },
  doubleWave: { "pt-BR": "Onda dupla", en: "Double wave" },
  // Callouts
  wedgeRectCallout: {
    "pt-BR": "Texto explicativo retangular",
    en: "Rectangular callout",
  },
  wedgeRoundRectCallout: {
    "pt-BR": "Texto explicativo retangular arredondado",
    en: "Rounded rectangular callout",
  },
  wedgeEllipseCallout: {
    "pt-BR": "Texto explicativo oval",
    en: "Oval callout",
  },
  cloudCallout: { "pt-BR": "Texto explicativo de nuvem", en: "Cloud callout" },
  borderCallout1: { "pt-BR": "Chamada de linha 1", en: "Line callout 1" },
  borderCallout2: { "pt-BR": "Chamada de linha 2", en: "Line callout 2" },
  borderCallout3: { "pt-BR": "Chamada de linha 3", en: "Line callout 3" },
  accentCallout1: {
    "pt-BR": "Chamada de linha 1 (acento)",
    en: "Line callout 1 (accent bar)",
  },
  accentCallout2: {
    "pt-BR": "Chamada de linha 2 (acento)",
    en: "Line callout 2 (accent bar)",
  },
  accentCallout3: {
    "pt-BR": "Chamada de linha 3 (acento)",
    en: "Line callout 3 (accent bar)",
  },
  callout1: {
    "pt-BR": "Chamada de linha 1 (sem borda)",
    en: "Line callout 1 (no border)",
  },
  callout2: {
    "pt-BR": "Chamada de linha 2 (sem borda)",
    en: "Line callout 2 (no border)",
  },
  callout3: {
    "pt-BR": "Chamada de linha 3 (sem borda)",
    en: "Line callout 3 (no border)",
  },
  accentBorderCallout1: {
    "pt-BR": "Chamada de linha 1 (borda e acento)",
    en: "Line callout 1 (border and accent bar)",
  },
  accentBorderCallout2: {
    "pt-BR": "Chamada de linha 2 (borda e acento)",
    en: "Line callout 2 (border and accent bar)",
  },
  accentBorderCallout3: {
    "pt-BR": "Chamada de linha 3 (borda e acento)",
    en: "Line callout 3 (border and accent bar)",
  },
};

/** Localized display name for a preset, falling back to the raw name. */
export function shapeLabel(preset: string, locale: Locale): string {
  return SHAPE_LABELS[preset]?.[locale] ?? preset;
}

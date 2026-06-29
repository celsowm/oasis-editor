import { createSignal, type Accessor, type Setter } from "solid-js";
import type { FontDialogInitialValues } from "@/ui/components/Dialogs/FontDialog.js";
import type { ParagraphDialogInitialValues } from "@/ui/components/Dialogs/ParagraphDialog.js";
import type { TablePropertiesDialogInitialValues } from "@/ui/components/Dialogs/TablePropertiesDialog.js";

export interface EditorDialogsState {
  linkDialog: Accessor<{ isOpen: boolean; initialHref: string }>;
  setLinkDialog: Setter<{ isOpen: boolean; initialHref: string }>;
  imageAltDialog: Accessor<{ isOpen: boolean; initialAlt: string }>;
  setImageAltDialog: Setter<{ isOpen: boolean; initialAlt: string }>;
  imageCaptionDialog: Accessor<{ isOpen: boolean; initialCaption: string }>;
  setImageCaptionDialog: Setter<{ isOpen: boolean; initialCaption: string }>;
  contextMenu: Accessor<{ isOpen: boolean; x: number; y: number }>;
  setContextMenu: Setter<{ isOpen: boolean; x: number; y: number }>;
  fontDialog: Accessor<{ isOpen: boolean; initial: FontDialogInitialValues }>;
  setFontDialog: Setter<{ isOpen: boolean; initial: FontDialogInitialValues }>;
  paragraphDialog: Accessor<{
    isOpen: boolean;
    initial: ParagraphDialogInitialValues;
  }>;
  setParagraphDialog: Setter<{
    isOpen: boolean;
    initial: ParagraphDialogInitialValues;
  }>;
  tablePropertiesDialog: Accessor<{
    isOpen: boolean;
    initial: TablePropertiesDialogInitialValues;
  }>;
  setTablePropertiesDialog: Setter<{
    isOpen: boolean;
    initial: TablePropertiesDialogInitialValues;
  }>;
}

export function createEditorDialogs(): EditorDialogsState {
  const [linkDialog, setLinkDialog] = createSignal<{
    isOpen: boolean;
    initialHref: string;
  }>({
    isOpen: false,
    initialHref: "",
  });
  const [imageAltDialog, setImageAltDialog] = createSignal<{
    isOpen: boolean;
    initialAlt: string;
  }>({
    isOpen: false,
    initialAlt: "",
  });
  const [imageCaptionDialog, setImageCaptionDialog] = createSignal<{
    isOpen: boolean;
    initialCaption: string;
  }>({
    isOpen: false,
    initialCaption: "",
  });
  const [contextMenu, setContextMenu] = createSignal<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({ isOpen: false, x: 0, y: 0 });
  const [fontDialog, setFontDialog] = createSignal<{
    isOpen: boolean;
    initial: FontDialogInitialValues;
  }>({
    isOpen: false,
    initial: {
      fontFamily: "",
      fontSize: "",
      color: "",
      colorMode: "automatic",
      highlight: "",
      shading: "",
      bold: false,
      italic: false,
      underline: false,
      underlineStyle: null,
      underlineColor: "",
      strike: false,
      doubleStrike: false,
      superscript: false,
      subscript: false,
      smallCaps: false,
      allCaps: false,
      hidden: false,
      characterScale: "",
      characterSpacing: "",
      baselineShift: "",
      kerningThreshold: "",
      ligatures: "",
      numberSpacing: "",
      numberForm: "",
      stylisticSet: "",
      contextualAlternates: false,
    },
  });
  const [paragraphDialog, setParagraphDialog] = createSignal<{
    isOpen: boolean;
    initial: ParagraphDialogInitialValues;
  }>({
    isOpen: false,
    initial: {
      align: "",
      indentLeft: "",
      indentRight: "",
      indentFirstLine: "",
      indentHanging: "",
      mirrorIndents: false,
      spacingBefore: "",
      spacingAfter: "",
      lineHeight: "",
      lineRule: "",
      contextualSpacing: false,
      outlineLevel: "",
      shading: "",
      borderStyle: "",
      borderWidth: "",
      borderColor: "",
      borderSideTop: false,
      borderSideRight: false,
      borderSideBottom: false,
      borderSideLeft: false,
      pageBreakBefore: false,
      keepWithNext: false,
      keepLinesTogether: false,
      widowControl: true,
      tabs: [],
    },
  });
  const [tablePropertiesDialog, setTablePropertiesDialog] = createSignal<{
    isOpen: boolean;
    initial: TablePropertiesDialogInitialValues;
  }>({
    isOpen: false,
    initial: {
      activeTab: "table",
      tableWidth: "",
      tableWidthUnit: "points",
      tableAlign: "",
      tableIndentLeft: "",
      tableWrapping: "none",
      floatingSummary: "",
      floatingHorizontalAnchor: "margin",
      floatingVerticalAnchor: "text",
      floatingX: "0",
      floatingY: "0",
      floatingXAlign: "",
      floatingYAlign: "",
      floatingDistanceTop: "0",
      floatingDistanceRight: "0",
      floatingDistanceBottom: "0",
      floatingDistanceLeft: "0",
      floatingOverlap: "overlap",
      rowHeight: "",
      rowHeightRule: "",
      repeatHeader: false,
      allowBreakAcrossPages: true,
      hiddenRow: false,
      columnWidth: "",
      cellWidth: "",
      cellVerticalAlign: "",
      cellTextDirection: "",
      cellNoWrap: false,
      cellFitText: false,
      cellHideMark: false,
      marginTop: "",
      marginRight: "",
      marginBottom: "",
      marginLeft: "",
      borderStyle: "none",
      borderWidth: "",
      borderColor: "",
      borderTop: false,
      borderRight: false,
      borderBottom: false,
      borderLeft: false,
      borderStart: false,
      borderEnd: false,
      borderTopLeftToBottomRight: false,
      borderTopRightToBottomLeft: false,
      shading: "",
      altTitle: "",
      altDescription: "",
    },
  });

  return {
    linkDialog,
    setLinkDialog,
    imageAltDialog,
    setImageAltDialog,
    imageCaptionDialog,
    setImageCaptionDialog,
    contextMenu,
    setContextMenu,
    fontDialog,
    setFontDialog,
    paragraphDialog,
    setParagraphDialog,
    tablePropertiesDialog,
    setTablePropertiesDialog,
  };
}

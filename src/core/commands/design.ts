import type {
  EditorDocumentDesign,
  EditorPageBorder,
  EditorState,
  EditorWatermark,
} from "@/core/model.js";

export type DesignThemeId = NonNullable<EditorDocumentDesign["themeId"]>;

const THEME_VALUES: Record<
  DesignThemeId,
  { color: string; heading: string; body: string }
> = {
  oasis: { color: "#0f766e", heading: "#115e59", body: "#1f2937" },
  office: { color: "#4472c4", heading: "#2f5597", body: "#1f2937" },
  facet: { color: "#8064a2", heading: "#604a7b", body: "#262626" },
  integral: { color: "#70ad47", heading: "#548235", body: "#1f2937" },
  ion: { color: "#ed7d31", heading: "#c55a11", body: "#262626" },
  retrospect: { color: "#5b9bd5", heading: "#2f75b5", body: "#1f2937" },
};

const COLOR_VALUES: Record<string, { color: string; heading: string }> = {
  oasis: { color: "#0f766e", heading: "#115e59" },
  office: { color: "#4472c4", heading: "#2f5597" },
  monochrome: { color: "#374151", heading: "#111827" },
  warm: { color: "#c2410c", heading: "#9a3412" },
};

const FONT_VALUES: Record<string, [string, string]> = {
  aptos: ["Aptos, sans-serif", "Aptos Display, sans-serif"],
  calibri: ["Calibri, sans-serif", "Calibri Light, sans-serif"],
  georgia: ["Georgia, serif", "Georgia, serif"],
  garamond: ["Garamond, serif", "Garamond, serif"],
};

function updateSemanticStyles(
  state: EditorState,
  theme: DesignThemeId,
): EditorState {
  const values = THEME_VALUES[theme];
  const styles = state.document.styles ?? {};
  const nextStyles = Object.fromEntries(
    Object.entries(styles).map(([id, style]) => {
      // Named custom styles are intentionally left untouched.
      if (
        !/^(normal|title|subtitle|heading[1-9]|quote|intensequote)$/i.test(id)
      )
        return [id, style];
      const isHeading = /^heading[1-9]$/i.test(id) || /title|quote/i.test(id);
      return [
        id,
        {
          ...style,
          textStyle: {
            ...(style.textStyle ?? {}),
            color: isHeading ? values.heading : values.body,
            ...(isHeading
              ? { fontFamily: "Aptos Display, sans-serif" }
              : { fontFamily: "Aptos, sans-serif" }),
          },
        },
      ];
    }),
  );
  return {
    ...state,
    document: {
      ...state.document,
      design: {
        ...(state.document.design ?? {}),
        themeId: theme,
        colorSchemeId: theme,
        themeData: {
          ...(state.document.design?.themeData ?? {}),
          sourceXml: undefined,
          colors: {
            ...(state.document.design?.themeData?.colors ?? {}),
            accent1: values.color,
            accent2: values.heading,
            dk2: values.body,
          },
          fonts: {
            ...(state.document.design?.themeData?.fonts ?? {}),
            major: {
              ...(state.document.design?.themeData?.fonts?.major ?? {}),
              majorHAnsi: "Aptos Display",
            },
            minor: {
              ...(state.document.design?.themeData?.fonts?.minor ?? {}),
              minorHAnsi: "Aptos",
            },
          },
        },
      },
      styles: nextStyles,
    },
  };
}

export function setDocumentDesign(
  state: EditorState,
  patch: Partial<EditorDocumentDesign>,
): EditorState {
  const design = { ...(state.document.design ?? {}), ...patch };
  return { ...state, document: { ...state.document, design } };
}

export function setDocumentFontScheme(
  state: EditorState,
  value: string,
): EditorState {
  const [body, heading] = FONT_VALUES[value] ?? FONT_VALUES.aptos!;
  const styles = Object.fromEntries(
    Object.entries(state.document.styles ?? {}).map(([id, style]) => {
      if (
        !/^(normal|title|subtitle|heading[1-9]|quote|intensequote)$/i.test(id)
      )
        return [id, style];
      return [
        id,
        {
          ...style,
          textStyle: {
            ...(style.textStyle ?? {}),
            fontFamily: /^heading|title|quote/i.test(id) ? heading : body,
          },
        },
      ];
    }),
  );
  return {
    ...state,
    document: {
      ...state.document,
      design: {
        ...(state.document.design ?? {}),
        fontSchemeId: value,
        themeData: {
          ...(state.document.design?.themeData ?? {}),
          sourceXml: undefined,
          fonts: {
            ...(state.document.design?.themeData?.fonts ?? {}),
            major: {
              ...(state.document.design?.themeData?.fonts?.major ?? {}),
              majorHAnsi: heading.split(",")[0]!.trim(),
            },
            minor: {
              ...(state.document.design?.themeData?.fonts?.minor ?? {}),
              minorHAnsi: body.split(",")[0]!.trim(),
            },
          },
        },
      },
      styles,
    },
  };
}

export function setDocumentParagraphSpacing(
  state: EditorState,
  value: NonNullable<EditorDocumentDesign["paragraphSpacingId"]>,
): EditorState {
  const spacing: Record<string, [number, number]> = {
    compact: [0, 4],
    tight: [0, 6],
    open: [0, 10],
    relaxed: [4, 12],
  };
  const [before, after] = spacing[value] ?? spacing.open!;
  const styles = Object.fromEntries(
    Object.entries(state.document.styles ?? {}).map(([id, style]) => {
      if (
        !/^(normal|title|subtitle|heading[1-9]|quote|intensequote)$/i.test(id)
      )
        return [id, style];
      return [
        id,
        {
          ...style,
          paragraphStyle: {
            ...(style.paragraphStyle ?? {}),
            spacingBefore: before,
            spacingAfter: after,
          },
        },
      ];
    }),
  );
  return {
    ...state,
    document: {
      ...state.document,
      design: { ...(state.document.design ?? {}), paragraphSpacingId: value },
      styles,
    },
  };
}

export function applyDocumentTheme(
  state: EditorState,
  theme: DesignThemeId,
): EditorState {
  return updateSemanticStyles(state, theme);
}

export function setDocumentColorScheme(
  state: EditorState,
  value: string,
): EditorState {
  const colors = COLOR_VALUES[value] ?? COLOR_VALUES.oasis!;
  const styles = Object.fromEntries(
    Object.entries(state.document.styles ?? {}).map(([id, style]) => {
      if (
        !/^(normal|title|subtitle|heading[1-9]|quote|intensequote)$/i.test(id)
      )
        return [id, style];
      const heading = /^heading[1-9]$/i.test(id) || /title|quote/i.test(id);
      return [
        id,
        {
          ...style,
          textStyle: {
            ...(style.textStyle ?? {}),
            color: heading ? colors.heading : colors.color,
          },
        },
      ];
    }),
  );
  return {
    ...state,
    document: {
      ...state.document,
      styles,
      design: {
        ...(state.document.design ?? {}),
        colorSchemeId: value,
        themeData: {
          ...(state.document.design?.themeData ?? {}),
          sourceXml: undefined,
          colors: {
            ...(state.document.design?.themeData?.colors ?? {}),
            accent1: colors.color,
            accent2: colors.heading,
          },
        },
      },
    },
  };
}

export function setDocumentPageColor(
  state: EditorState,
  color: string | null,
): EditorState {
  return setDocumentDesign(state, { pageColor: color });
}

export function setDocumentWatermark(
  state: EditorState,
  watermark: EditorWatermark | null,
): EditorState {
  return setDocumentDesign(state, { watermark });
}

export function setDocumentPageBorder(
  state: EditorState,
  border: EditorPageBorder | null,
): EditorState {
  const sections = (state.document.sections ?? []).map((section) => ({
    ...section,
    pageBorder: border,
  }));
  return {
    ...state,
    document: {
      ...state.document,
      sections,
      design: { ...(state.document.design ?? {}) },
    },
  };
}

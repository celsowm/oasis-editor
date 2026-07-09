/**
 * Builds the content-stream operators for a single PDF page (top-left origin in;
 * y-axis flipped to PDF bottom-left origin here). Drawing of text and images is
 * delegated to the font/image tables for resource resolution. A single
 * `emitTextBlock` envelope is shared by base-14 and embedded-Unicode text so the
 * `BT … Tf … Td … ET` sequence lives in one place.
 */
import type {
  OasisPdfAxialGradient,
  OasisPdfImageOptions,
  OasisPdfLineOptions,
  OasisPdfPage,
  OasisPdfPathOptions,
  OasisPdfRectOptions,
  OasisPdfTextOptions,
} from "./pdfTypes.js";
import type { PdfFontTable } from "./PdfFontTable.js";
import type { PdfImageTable } from "./PdfImageTable.js";
import type { PdfShadingTable } from "./PdfShadingTable.js";
import {
  colorCommand,
  encodePdfHexString,
  formatNumber,
  textMarkerComment,
} from "./pdfPrimitives.js";

export class PdfContentStream {
  constructor(
    readonly page: OasisPdfPage,
    private readonly fonts: PdfFontTable,
    private readonly images: PdfImageTable,
    private readonly shadings: PdfShadingTable,
  ) {}

  /**
   * Registers an axial gradient for use as a glyph fill on this page. Coordinates
   * come in the writer's top-left point space and are flipped to PDF bottom-left
   * space here; the returned name is referenced via `OasisPdfTextOptions`.
   */
  registerAxialGradient(gradient: OasisPdfAxialGradient): string {
    const name = this.shadings.register({
      x0: gradient.x0,
      y0: this.page.height - gradient.y0,
      x1: gradient.x1,
      y1: this.page.height - gradient.y1,
      stops: gradient.stops,
    });
    this.page.shadingResourceNames.add(name);
    return name;
  }

  drawRect(options: OasisPdfRectOptions): void {
    const page = this.page;
    if (options.width <= 0 || options.height <= 0) {
      return;
    }

    const commands = ["q"];
    if (options.fill) {
      commands.push(colorCommand(options.fill, "rg", [1, 1, 1]));
    }
    if (options.stroke) {
      commands.push(colorCommand(options.stroke, "RG", [0, 0, 0]));
      commands.push(`${formatNumber(options.lineWidth ?? 1)} w`);
    }

    commands.push(
      [
        formatNumber(options.x),
        formatNumber(page.height - options.y - options.height),
        formatNumber(options.width),
        formatNumber(options.height),
        "re",
      ].join(" "),
    );

    if (options.fill && options.stroke) {
      commands.push("B");
    } else if (options.fill) {
      commands.push("f");
    } else if (options.stroke) {
      commands.push("S");
    }
    commands.push("Q");
    page.commands.push(commands.join("\n"));
  }

  drawLine(options: OasisPdfLineOptions): void {
    const page = this.page;
    const dashCommand =
      options.dashArray && options.dashArray.length > 0
        ? `[${options.dashArray.map((value): string => formatNumber(value)).join(" ")}] 0 d`
        : null;

    const commands: string[] = [
      "q",
      colorCommand(options.stroke, "RG", [0, 0, 0]),
    ];
    if (dashCommand) {
      commands.push(dashCommand);
    }
    commands.push(
      `${formatNumber(options.lineWidth ?? 1)} w`,
      `${formatNumber(options.x1)} ${formatNumber(page.height - options.y1)} m`,
      `${formatNumber(options.x2)} ${formatNumber(page.height - options.y2)} l`,
      "S",
      "Q",
    );
    page.commands.push(commands.join("\n"));
  }

  // Fills/strokes an arbitrary path. Segment coordinates are in points with a
  // top-left origin (callers convert px→pt, like drawRect/drawLine); the y axis
  // is flipped here to the PDF bottom-left origin.
  drawPath(options: OasisPdfPathOptions): void {
    const page = this.page;
    if (options.segments.length === 0) {
      return;
    }
    if (!options.fill && !options.stroke) {
      return;
    }

    const flip = (yy: number): number => page.height - yy;
    const commands = ["q"];
    if (options.fill) {
      commands.push(colorCommand(options.fill, "rg", [1, 1, 1]));
    }
    if (options.stroke) {
      commands.push(colorCommand(options.stroke, "RG", [0, 0, 0]));
      commands.push(`${formatNumber(options.lineWidth ?? 1)} w`);
    }

    for (const segment of options.segments) {
      switch (segment.type) {
        case "move":
          commands.push(
            `${formatNumber(segment.x)} ${formatNumber(flip(segment.y))} m`,
          );
          break;
        case "line":
          commands.push(
            `${formatNumber(segment.x)} ${formatNumber(flip(segment.y))} l`,
          );
          break;
        case "cubic":
          commands.push(
            `${formatNumber(segment.x1)} ${formatNumber(flip(segment.y1))} ` +
              `${formatNumber(segment.x2)} ${formatNumber(flip(segment.y2))} ` +
              `${formatNumber(segment.x)} ${formatNumber(flip(segment.y))} c`,
          );
          break;
        case "close":
          commands.push("h");
          break;
      }
    }

    if (options.fill && options.stroke) {
      commands.push("B");
    } else if (options.fill) {
      commands.push("f");
    } else {
      commands.push("S");
    }
    commands.push("Q");
    page.commands.push(commands.join("\n"));
  }

  // Saves the graphics state (`q`). Pair with restoreGraphicsState. Any draw
  // commands emitted in between inherit the current transform/clip.
  saveGraphicsState(): void {
    this.page.commands.push("q");
  }

  restoreGraphicsState(): void {
    this.page.commands.push("Q");
  }

  // Concatenates a clockwise rotation (in degrees, matching the canvas/editor
  // convention) about a top-left-origin point onto the current CTM. Must sit
  // inside a saveGraphicsState/restoreGraphicsState pair.
  rotateAbout(centerX: number, centerY: number, degrees: number): void {
    const page = this.page;
    if (!degrees) {
      return;
    }
    const cyf = page.height - centerY;
    const radians = (-degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const e = centerX - centerX * cos + cyf * sin;
    const f = cyf - centerX * sin - cyf * cos;
    page.commands.push(
      `${formatNumber(cos)} ${formatNumber(sin)} ${formatNumber(-sin)} ` +
        `${formatNumber(cos)} ${formatNumber(e)} ${formatNumber(f)} cm`,
    );
  }

  // Intersects the clip path with a rectangle (top-left origin). Must sit inside
  // a saveGraphicsState/restoreGraphicsState pair so the clip can be undone.
  clipRect(x: number, y: number, width: number, height: number): void {
    const page = this.page;
    if (width <= 0 || height <= 0) {
      return;
    }
    page.commands.push(
      `${formatNumber(x)} ${formatNumber(page.height - y - height)} ` +
        `${formatNumber(width)} ${formatNumber(height)} re`,
      "W",
      "n",
    );
  }

  drawText(options: OasisPdfTextOptions): void {
    if (options.text.length === 0) {
      return;
    }

    const fontResourceName = this.fonts.resolveAndMarkFontName(options);
    const unicodeState = this.fonts.getUnicodeState(fontResourceName);
    const showCommand = unicodeState
      ? this.fonts.buildUnicodeShowCommand(
          unicodeState,
          options.text,
          options.fontFeatures,
        )
      : `<${encodePdfHexString(options.text)}> Tj`;
    if (showCommand === null) {
      return;
    }
    if (options.gradientShadingName) {
      this.emitGradientTextBlock(
        fontResourceName,
        showCommand,
        options,
        options.gradientShadingName,
      );
      return;
    }
    this.emitTextBlock(fontResourceName, showCommand, options);
  }

  private textSetupCommands(
    fontResourceName: string,
    options: OasisPdfTextOptions,
  ): string[] {
    return [
      `/${fontResourceName} ${formatNumber(options.fontSize ?? 12)} Tf`,
      ...(options.horizontalScale &&
      options.horizontalScale > 0 &&
      options.horizontalScale !== 100
        ? [`${formatNumber(options.horizontalScale)} Tz`]
        : []),
      ...(options.characterSpacing && options.characterSpacing !== 0
        ? [`${formatNumber(options.characterSpacing)} Tc`]
        : []),
    ];
  }

  private emitTextBlock(
    fontResourceName: string,
    showCommand: string,
    options: OasisPdfTextOptions,
  ): void {
    const page = this.page;
    page.commands.push(
      [
        textMarkerComment(options.text),
        "BT",
        colorCommand(options.color, "rg", [0, 0, 0]),
        ...(options.renderMode && options.renderMode !== 0
          ? [
              colorCommand(
                options.strokeColor ?? options.color,
                "RG",
                [0, 0, 0],
              ),
              `${formatNumber(
                options.strokeWidth ??
                  Math.max(0.3, (options.fontSize ?? 12) * 0.03),
              )} w`,
              `${options.renderMode} Tr`,
            ]
          : []),
        ...this.textSetupCommands(fontResourceName, options),
        `${formatNumber(options.x)} ${formatNumber(page.height - options.y)} Td`,
        showCommand,
        "ET",
      ].join("\n"),
    );
  }

  /**
   * Fills glyphs with an axial gradient: the text is drawn in clip render mode
   * (`7 Tr`) so the glyph outlines become the clip path, then the shading is
   * painted through them with `sh`. The whole sequence is isolated in a
   * `q … Q` pair so the clip does not leak. Outline/stroke is not combined with
   * gradient fill (the gradient supersedes it).
   */
  private emitGradientTextBlock(
    fontResourceName: string,
    showCommand: string,
    options: OasisPdfTextOptions,
    shadingName: string,
  ): void {
    const page = this.page;
    page.commands.push(
      [
        textMarkerComment(options.text),
        "q",
        "BT",
        ...this.textSetupCommands(fontResourceName, options),
        "7 Tr",
        `${formatNumber(options.x)} ${formatNumber(page.height - options.y)} Td`,
        showCommand,
        "ET",
        `/${shadingName} sh`,
        "Q",
      ].join("\n"),
    );
  }

  drawImage(options: OasisPdfImageOptions): void {
    const page = this.page;
    if (
      options.width <= 0 ||
      options.height <= 0 ||
      !this.images.has(options.resourceName)
    ) {
      return;
    }

    page.imageResourceNames.add(options.resourceName);
    const bottom = page.height - options.y - options.height;
    const rotation = Number.isFinite(options.rotation)
      ? (options.rotation ?? 0)
      : 0;

    const crop = options.crop;
    const cl = crop?.left ?? 0;
    const ct = crop?.top ?? 0;
    const cr = crop?.right ?? 0;
    const cb = crop?.bottom ?? 0;
    if (crop && (cl > 0 || ct > 0 || cr > 0 || cb > 0)) {
      this.drawCroppedImage(options, bottom, rotation, {
        left: cl,
        top: ct,
        right: cr,
        bottom: cb,
      });
      return;
    }

    if (rotation === 0) {
      page.commands.push(
        [
          "q",
          [
            formatNumber(options.width),
            "0",
            "0",
            formatNumber(options.height),
            formatNumber(options.x),
            formatNumber(bottom),
            "cm",
          ].join(" "),
          `/${options.resourceName} Do`,
          "Q",
        ].join("\n"),
      );
      return;
    }

    // Match the canvas/editor model: positive degrees rotate the image
    // clockwise visually around the box center, while PDF's math-space uses
    // counter-clockwise positive angles.
    const radians = (-rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const a = options.width * cos;
    const b = options.width * sin;
    const c = -options.height * sin;
    const d = options.height * cos;
    const e = options.x + options.width / 2 - 0.5 * a - 0.5 * c;
    const f = bottom + options.height / 2 - 0.5 * b - 0.5 * d;
    page.commands.push(
      [
        "q",
        [
          formatNumber(a),
          formatNumber(b),
          formatNumber(c),
          formatNumber(d),
          formatNumber(e),
          formatNumber(f),
          "cm",
        ].join(" "),
        `/${options.resourceName} Do`,
        "Q",
      ].join("\n"),
    );
  }

  /**
   * Draws a cropped image by clipping to the displayed box and scaling the full
   * image so only the cropped sub-region fills it — mirroring the canvas/DOCX
   * `a:srcRect` semantics. Works with rotation by mapping box-local space to the
   * page (rotation about the box centre), clipping in that space, then drawing
   * the enlarged image behind the clip.
   */
  private drawCroppedImage(
    options: OasisPdfImageOptions,
    bottom: number,
    rotation: number,
    crop: { left: number; top: number; right: number; bottom: number },
  ): void {
    const page = this.page;
    const { width, height } = options;
    const fw = Math.max(1e-4, 1 - crop.left - crop.right);
    const fh = Math.max(1e-4, 1 - crop.top - crop.bottom);
    const fullWidth = width / fw;
    const fullHeight = height / fh;
    // Full-image placement in box-local space (box occupies [0,width]×[0,height],
    // y-up). `left`/`bottom` crop push the image origin below/left of the box.
    const originX = -crop.left * fullWidth;
    const originY = -crop.bottom * fullHeight;

    // R: box-local → page, with rotation about the box centre (see drawImage).
    const radians = (-rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const cxl = width / 2;
    const cyl = height / 2;
    const cxPage = options.x + width / 2;
    const cyPage = bottom + height / 2;
    const ra = cos;
    const rb = sin;
    const rc = -sin;
    const rd = cos;
    const re = cxPage - (ra * cxl + rc * cyl);
    const rf = cyPage - (rb * cxl + rd * cyl);

    page.commands.push(
      [
        "q",
        [
          formatNumber(ra),
          formatNumber(rb),
          formatNumber(rc),
          formatNumber(rd),
          formatNumber(re),
          formatNumber(rf),
          "cm",
        ].join(" "),
        // Clip to the displayed box (box-local coordinates).
        `0 0 ${formatNumber(width)} ${formatNumber(height)} re W n`,
        [
          formatNumber(fullWidth),
          "0",
          "0",
          formatNumber(fullHeight),
          formatNumber(originX),
          formatNumber(originY),
          "cm",
        ].join(" "),
        `/${options.resourceName} Do`,
        "Q",
      ].join("\n"),
    );
  }
}

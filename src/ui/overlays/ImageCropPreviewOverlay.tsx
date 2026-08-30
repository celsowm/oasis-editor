import type { JSX } from "solid-js";
import type { EditorImageCrop, EditorImageRunData } from "@/core/model.js";

export interface ImageCropPreviewOverlayProps {
  box: () => {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  image: () => EditorImageRunData | null;
  src: () => string;
  rotation: () => number;
}

function fraction(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(0.99, value ?? 0)) : 0;
}

/** Shows the uncropped source below the crop mask, as Word does while editing. */
export function ImageCropPreviewOverlay(
  props: ImageCropPreviewOverlayProps,
): JSX.Element {
  const geometry = (): {
    crop: EditorImageCrop;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null => {
    const box = props.box();
    const image = props.image();
    if (!box || !image) return null;
    const sourceWidth = image.intrinsicWidth ?? image.width;
    const sourceHeight = image.intrinsicHeight ?? image.height;
    const sourceRatio = sourceWidth / Math.max(1, sourceHeight);
    if (image.cropFit === "fit" && sourceRatio > 0) {
      const frameRatio = box.width / Math.max(1, box.height);
      const width =
        sourceRatio > frameRatio ? box.width : box.height * sourceRatio;
      const height = width / sourceRatio;
      return {
        crop: {},
        left: box.left + (box.width - width) / 2,
        top: box.top + (box.height - height) / 2,
        width,
        height,
      };
    }
    const crop = image.crop ?? {};
    const leftCrop = fraction(crop.left);
    const topCrop = fraction(crop.top);
    const rightCrop = fraction(crop.right);
    const bottomCrop = fraction(crop.bottom);
    const width = box.width / Math.max(0.01, 1 - leftCrop - rightCrop);
    const height = box.height / Math.max(0.01, 1 - topCrop - bottomCrop);
    return {
      crop,
      left: box.left - leftCrop * width,
      top: box.top - topCrop * height,
      width,
      height,
    };
  };

  return (
    <div
      aria-hidden="true"
      class="oasis-editor-image-crop-preview"
      style={{
        display: geometry() ? undefined : "none",
        left: `${props.box()?.left ?? 0}px`,
        top: `${props.box()?.top ?? 0}px`,
        width: `${props.box()?.width ?? 0}px`,
        height: `${props.box()?.height ?? 0}px`,
        transform: `rotate(${props.rotation()}deg)`,
      }}
    >
      <img
        src={props.src()}
        alt=""
        draggable={false}
        style={{
          left: `${(geometry()?.left ?? 0) - (props.box()?.left ?? 0)}px`,
          top: `${(geometry()?.top ?? 0) - (props.box()?.top ?? 0)}px`,
          width: `${geometry()?.width ?? 0}px`,
          height: `${geometry()?.height ?? 0}px`,
        }}
      />
    </div>
  );
}

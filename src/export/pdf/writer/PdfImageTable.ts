/**
 * Owns the writer's image XObjects: registration/deduplication by resource name
 * and serialization to ASCIIHex+DCTDecode image objects. The content stream
 * looks images up by name; the serializer emits their objects.
 */
import type { AddPdfObject, OasisPdfImageResource } from "./pdfTypes.js";
import { asciiHexImageStreamObjectBody } from "./pdfPrimitives.js";

export class PdfImageTable {
  private readonly imageResources = new Map<string, OasisPdfImageResource>();

  registerImageResource(
    resource: Omit<OasisPdfImageResource, "resourceName"> & {
      resourceName?: string;
    },
  ): string {
    const resourceName =
      resource.resourceName ?? `Im${this.imageResources.size + 1}`;
    if (!this.imageResources.has(resourceName)) {
      this.imageResources.set(resourceName, {
        resourceName,
        width: Math.max(1, Math.round(resource.width)),
        height: Math.max(1, Math.round(resource.height)),
        data: resource.data,
        filter: resource.filter,
      });
    }
    return resourceName;
  }

  has(resourceName: string): boolean {
    return this.imageResources.has(resourceName);
  }

  /** Emits each registered image object, keyed by resource name for page maps. */
  buildImageObjects(addObject: AddPdfObject): Map<string, number> {
    const imageObjectIds = new Map<string, number>();
    for (const image of this.imageResources.values()) {
      imageObjectIds.set(
        image.resourceName,
        this.addImageObject(image, addObject),
      );
    }
    return imageObjectIds;
  }

  private addImageObject(
    resource: OasisPdfImageResource,
    addObject: AddPdfObject,
  ): number {
    return addObject(
      asciiHexImageStreamObjectBody(resource.data, [
        "/Type /XObject",
        "/Subtype /Image",
        `/Width ${resource.width}`,
        `/Height ${resource.height}`,
        "/ColorSpace /DeviceRGB",
        "/BitsPerComponent 8",
      ]),
    );
  }
}

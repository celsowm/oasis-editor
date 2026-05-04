export async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }
      reject(new Error("Failed to read file as ArrayBuffer."));
    };
    reader.readAsArrayBuffer(file);
  });
}

export function findImageFileFromTransfer(
  transfer: Pick<DataTransfer, "files" | "items"> | null | undefined,
): File | null {
  if (!transfer) {
    return null;
  }

  for (const item of Array.from(transfer.items ?? [])) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();
    if (file && file.type.startsWith("image/")) {
      return file;
    }
  }

  for (const file of Array.from(transfer.files ?? [])) {
    if (file.type.startsWith("image/")) {
      return file;
    }
  }

  return null;
}

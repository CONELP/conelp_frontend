function normalizeRotation(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized;
}

function inferMimeType(file: File): string {
  if (file.type && file.type.startsWith("image/")) {
    return file.type;
  }
  return "image/jpeg";
}

function inferOutputType(mimeType: string): string {
  if (mimeType === "image/png" || mimeType === "image/webp") {
    return mimeType;
  }
  return "image/jpeg";
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 로드에 실패했습니다."));
    };

    image.src = objectUrl;
  });
}

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지 로드에 실패했습니다."));
    image.src = src;
  });
}

function inferDataUrlMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/i);
  if (match?.[1]) {
    return match[1];
  }
  return "image/jpeg";
}

function drawRotated(
  image: HTMLImageElement,
  rotation: number,
): HTMLCanvasElement {
  const isQuarterTurn = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = isQuarterTurn ? image.naturalHeight : image.naturalWidth;
  canvas.height = isQuarterTurn ? image.naturalWidth : image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D 컨텍스트를 생성하지 못했습니다.");
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("이미지 변환 결과가 비어 있습니다."));
      },
      mimeType,
      0.92,
    );
  });
}

export async function rotateImageFile(file: File, degrees: number): Promise<File> {
  const rotation = normalizeRotation(degrees);

  if (rotation === 0) {
    return file;
  }

  const sourceMimeType = inferMimeType(file);
  const outputMimeType = inferOutputType(sourceMimeType);

  const image = await loadImageFromBlob(file);
  const canvas = drawRotated(image, rotation);
  const blob = await canvasToBlob(canvas, outputMimeType);

  return new File([blob], file.name, {
    type: outputMimeType,
    lastModified: file.lastModified,
  });
}

export function nextRotationStep(rotation: number, step = 90): number {
  return rotation + step;
}

export async function rotateImageDataUrl(
  dataUrl: string,
  degrees: number,
): Promise<string> {
  const rotation = normalizeRotation(degrees);

  if (rotation === 0) {
    return dataUrl;
  }

  const sourceMimeType = inferDataUrlMimeType(dataUrl);
  const outputMimeType = inferOutputType(sourceMimeType);

  const image = await loadImageFromSrc(dataUrl);
  const canvas = drawRotated(image, rotation);

  return canvas.toDataURL(outputMimeType, 0.92);
}

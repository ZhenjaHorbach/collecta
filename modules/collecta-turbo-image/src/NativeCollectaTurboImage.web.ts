import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  compressImage(
    uri: string,
    maxWidth: number,
    quality: number,
    stripExif: boolean,
    format: string
  ): Promise<{
    uri: string;
    size: number;
    width: number;
    height: number;
    durationMs: number;
  }>;
}

const FORMAT_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  // Browsers can't encode HEIC — fall back to JPEG.
  heic: 'image/jpeg',
};

async function decode(uri: string): Promise<HTMLImageElement> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`[collecta-turbo-image] fetch ${uri} → ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = objectUrl;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImage(
  uri: string,
  maxWidth: number,
  quality: number,
  // stripExif is intentionally unused — canvas re-encode drops EXIF.
  _stripExif: boolean,
  format: string
): Promise<{ uri: string; size: number; width: number; height: number; durationMs: number }> {
  const start =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  const img = await decode(uri);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > maxWidth ? maxWidth / longest : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[collecta-turbo-image] 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  const mime = FORMAT_MIME[format] ?? 'image/jpeg';
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error('[collecta-turbo-image] canvas.toBlob returned null')),
      mime,
      quality
    );
  });

  const elapsed =
    (typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()) - start;

  return {
    uri: URL.createObjectURL(blob),
    size: blob.size,
    width,
    height,
    durationMs: elapsed,
  };
}

const impl = { compressImage } as unknown as Spec;
export default impl;

export type ImageFormat = 'jpeg' | 'heic' | 'png';

export interface CompressOptions {
  uri: string;
  maxWidth: number;
  quality: number;
  stripExif: boolean;
  format: ImageFormat;
}

export interface CompressResult {
  uri: string;
  size: number;
  width: number;
  height: number;
  durationMs: number;
}

import NativeCollectaTurboImage from './NativeCollectaTurboImage';
import type { CompressOptions, CompressResult } from './types';

export type { CompressOptions, CompressResult, ImageFormat } from './types';

export function compressImage(options: CompressOptions): Promise<CompressResult> {
  const { uri, maxWidth, quality, stripExif, format } = options;
  return NativeCollectaTurboImage.compressImage(uri, maxWidth, quality, stripExif, format);
}

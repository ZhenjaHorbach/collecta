import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

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

export default TurboModuleRegistry.getEnforcing<Spec>('CollectaTurboImage');

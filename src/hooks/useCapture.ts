import { compressImage } from 'collecta-turbo-image';
import { useCallback, useState } from 'react';

import { validateFind } from '@services/ai-validation.service';
import { uploadFindPhoto } from '@services/find-photo.service';
import { createFind } from '@services/finds.service';

import type { Find, ValidationResult } from '@schemas';

export type CaptureStage =
  | 'idle'
  | 'compressing'
  | 'uploading'
  | 'creating'
  | 'validating'
  | 'done'
  | 'error';

interface CaptureState {
  stage: CaptureStage;
  find: Find | null;
  validation: ValidationResult | null;
  validationStatus: 'ok' | 'vision_failed' | 'invoke_failed' | null;
  error: string | null;
}

const INITIAL: CaptureState = {
  stage: 'idle',
  find: null,
  validation: null,
  validationStatus: null,
  error: null,
};

interface CaptureInput {
  rawPhotoUri: string;
  userId: string;
  collectionItemId: string;
  locationLat?: number | null;
  locationLng?: number | null;
}

export function useCapture() {
  const [state, setState] = useState<CaptureState>(INITIAL);

  const capture = useCallback(async (input: CaptureInput): Promise<void> => {
    let currentStage: CaptureStage = 'idle';
    const at = (s: CaptureStage) => {
      currentStage = s;
    };
    try {
      at('compressing');
      setState((s) => ({ ...s, stage: 'compressing', error: null }));
      const compressed = await compressImage({
        uri: input.rawPhotoUri,
        maxWidth: 1920,
        quality: 0.7,
        stripExif: true,
        format: 'jpeg',
      });

      at('uploading');
      setState((s) => ({ ...s, stage: 'uploading' }));
      const photoUrl = await uploadFindPhoto(compressed.uri, input.userId);

      at('creating');
      setState((s) => ({ ...s, stage: 'creating' }));
      const find = await createFind({
        userId: input.userId,
        collectionItemId: input.collectionItemId,
        photoUrl,
        locationLat: input.locationLat,
        locationLng: input.locationLng,
      });

      at('validating');
      setState((s) => ({ ...s, stage: 'validating', find }));
      const outcome = await validateFind(find.id);

      setState({
        stage: 'done',
        find,
        validation: outcome.result,
        validationStatus: outcome.status,
        error: outcome.error,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[capture] failed at stage=${currentStage}`, err);
      setState({
        stage: 'error',
        find: null,
        validation: null,
        validationStatus: null,
        error: `[${currentStage}] ${msg}`,
      });
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, capture, reset };
}

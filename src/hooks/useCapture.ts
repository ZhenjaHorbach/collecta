import { compressImage } from 'collecta-turbo-image';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  validateFind,
  type ApiUsage,
  type ValidateFindOutcome,
} from '@services/ai-validation.service';
import { deleteFindPhoto, uploadFindPhoto } from '@services/find-photo.service';
import { createFind } from '@services/finds.service';

import type { Find, ValidationResult } from '@schemas';

export type CaptureStage = 'idle' | 'compressing' | 'uploading' | 'validating' | 'done' | 'error';

interface PendingFind {
  photoUrl: string;
  collectionItemId: string;
  locationLat: number | null;
  locationLng: number | null;
  // AI metadata captured during validation; passed to createFind on commit
  // so usage tracking lands on the same row as the validation result.
  aiModel: string | null;
  aiUsage: ApiUsage | null;
}

interface CaptureState {
  stage: CaptureStage;
  pending: PendingFind | null;
  validation: ValidationResult | null;
  validationStatus: ValidateFindOutcome['status'] | null;
  error: string | null;
}

const INITIAL: CaptureState = {
  stage: 'idle',
  pending: null,
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

interface CommitInput {
  userId: string;
  notes?: string | null;
}

// Capture flow:
//   capture()  → compress + upload + validate (no DB write)
//   commit()   → createFind with the validated result baked in
//   discard()  → delete the uploaded storage object; no DB cleanup needed
//                because the find row was never inserted
//   reset()    → just zero local state; storage object untouched (use only
//                after commit() succeeds and pending is already cleared)
export function useCapture() {
  const [state, setState] = useState<CaptureState>(INITIAL);

  // Mirror pending in a ref so discard() can read the current value without
  // becoming a function whose identity changes on every state update.
  const pendingRef = useRef<PendingFind | null>(null);
  useEffect(() => {
    pendingRef.current = state.pending;
  }, [state.pending]);

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
      const initialPending: PendingFind = {
        photoUrl,
        collectionItemId: input.collectionItemId,
        locationLat: input.locationLat ?? null,
        locationLng: input.locationLng ?? null,
        aiModel: null,
        aiUsage: null,
      };

      at('validating');
      setState((s) => ({ ...s, stage: 'validating', pending: initialPending }));
      const outcome = await validateFind(photoUrl, input.collectionItemId);

      const pending: PendingFind = {
        ...initialPending,
        aiModel: outcome.model,
        aiUsage: outcome.usage,
      };
      setState({
        stage: 'done',
        pending,
        validation: outcome.result,
        validationStatus: outcome.status,
        error: outcome.error,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[capture] failed at stage=${currentStage}`, err);
      setState({
        stage: 'error',
        pending: null,
        validation: null,
        validationStatus: null,
        error: `[${currentStage}] ${msg}`,
      });
    }
  }, []);

  // Commit the pending find to the DB with the validation result baked in.
  // Throws on createFind failure so the caller can surface the error and
  // keep the user on the result screen for retry. On success the pending
  // ref is cleared so a subsequent discard() is a no-op.
  const commit = useCallback(
    async (input: CommitInput): Promise<Find> => {
      const pending = pendingRef.current;
      const validation = state.validation;
      if (!pending) throw new Error('Nothing to commit — no pending photo.');
      const find = await createFind({
        userId: input.userId,
        collectionItemId: pending.collectionItemId,
        photoUrl: pending.photoUrl,
        locationLat: pending.locationLat,
        locationLng: pending.locationLng,
        notes: input.notes ?? null,
        aiValidated: validation?.valid ?? null,
        aiConfidence: validation?.confidence ?? null,
        aiNotes: validation ? `${validation.detected} — ${validation.suggestion}` : null,
        aiModel: pending.aiModel,
        aiInputTokens: pending.aiUsage?.inputTokens ?? null,
        aiOutputTokens: pending.aiUsage?.outputTokens ?? null,
        aiCacheReadTokens: pending.aiUsage?.cacheReadInputTokens ?? null,
        aiCacheCreationTokens: pending.aiUsage?.cacheCreationInputTokens ?? null,
      });
      pendingRef.current = null;
      setState(INITIAL);
      return find;
    },
    [state.validation]
  );

  // Throw away the uploaded photo and clear state. Best-effort: storage
  // failures are logged but not thrown — UI shouldn't be blocked by cleanup.
  const discard = useCallback(async (): Promise<void> => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setState(INITIAL);
    if (!pending) return;
    await deleteFindPhoto(pending.photoUrl).catch((e) =>
      console.warn('[capture.discard] photo', e)
    );
  }, []);

  const reset = useCallback(() => {
    pendingRef.current = null;
    setState(INITIAL);
  }, []);

  return { ...state, capture, commit, discard, reset };
}

import { compressImage } from 'collecta-turbo-image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CAPTURE_IMAGE_HI_RES, CAPTURE_IMAGE_STANDARD } from '@constants/capture';
import {
  validateFind,
  type ApiUsage,
  type ValidateFindMode,
  type ValidateFindOutcome,
  type ValidationCandidate,
} from '@services/ai-validation.service';
import { deleteFindPhoto, uploadFindPhoto } from '@services/find-photo.service';
import { createFind } from '@services/finds.service';
import { readSetting } from './useSetting';

import type { Find, ValidationResult } from '@schemas';

export type CaptureStage = 'idle' | 'compressing' | 'uploading' | 'validating' | 'done' | 'error';

interface PendingFind {
  photoUrl: string;
  // The item we'll commit against. In verify mode the caller supplies it up
  // front; in PR3 modes (match-in-collection / discover) it is filled in from
  // the validation outcome's matched_item_id once the AI picks one.
  collectionItemId: string | null;
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
  mode: ValidateFindMode | null;
  matchedCollectionId: string | null;
  matchedItemId: string | null;
  candidateItems: ValidationCandidate[];
  candidateCollections: ValidationCandidate[];
  error: string | null;
}

const INITIAL: CaptureState = {
  stage: 'idle',
  pending: null,
  validation: null,
  validationStatus: null,
  mode: null,
  matchedCollectionId: null,
  matchedItemId: null,
  candidateItems: [],
  candidateCollections: [],
  error: null,
};

interface CaptureInput {
  rawPhotoUri: string;
  userId: string;
  // Provide whichever the caller knows. PR1: callers always supply
  // collectionItemId (verify mode). PR3 will start sending collectionId-only
  // (match-in-collection) and neither (discover).
  collectionItemId?: string | null;
  collectionId?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

interface CommitInput {
  userId: string;
  notes?: string | null;
  // Override the collectionItemId baked into pending. Used by the camera
  // ambiguous / manual-pick / create-on-the-fly flows where the user resolves
  // the item *after* validation. Falls back to pending.collectionItemId when
  // omitted.
  collectionItemIdOverride?: string;
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
      // High-res toggle (SettingsScreen → Capture). Off by default — it
      // doubles upload size and most photos don't need it. Read inline so
      // changes take effect on the next capture without remounting.
      const preset = readSetting('highResUploads') ? CAPTURE_IMAGE_HI_RES : CAPTURE_IMAGE_STANDARD;
      const compressed = await compressImage({
        uri: input.rawPhotoUri,
        maxWidth: preset.maxWidth,
        quality: preset.quality,
        stripExif: true,
        format: 'jpeg',
      });

      at('uploading');
      setState((s) => ({ ...s, stage: 'uploading' }));
      const photoUrl = await uploadFindPhoto(compressed.uri, input.userId);
      const initialPending: PendingFind = {
        photoUrl,
        collectionItemId: input.collectionItemId ?? null,
        locationLat: input.locationLat ?? null,
        locationLng: input.locationLng ?? null,
        aiModel: null,
        aiUsage: null,
      };

      at('validating');
      setState((s) => ({ ...s, stage: 'validating', pending: initialPending }));
      // AI verification toggle (SettingsScreen → Capture). When off, skip
      // the paid Vision call entirely and synthesise a "passed" outcome so
      // the rest of the flow proceeds as if validation succeeded. Verify
      // (collection_item_id passed) commits straight away. The other two
      // modes leave matchedItemId / matchedCollectionId null so the result
      // sheet falls through to manual pick.
      const aiOff = readSetting('aiVerification') === false;
      const synthMode: ValidateFindMode = input.collectionItemId
        ? 'verify'
        : input.collectionId
          ? 'match-in-collection'
          : 'discover';
      const outcome: ValidateFindOutcome = aiOff
        ? {
            status: 'ok',
            mode: synthMode,
            // Leave `result: null` so commit() writes ai_validated /
            // ai_confidence / ai_notes as null on the row. Storing a fake
            // confidence: 1 would be indistinguishable in analytics from a
            // real Vision call that returned 100%.
            result: null,
            matchedCollectionId: input.collectionId ?? null,
            matchedItemId: input.collectionItemId ?? null,
            candidateItems: [],
            candidateCollections: [],
            model: null,
            usage: null,
            error: null,
          }
        : await validateFind({
            photoUrl,
            collectionItemId: input.collectionItemId ?? undefined,
            collectionId: input.collectionId ?? undefined,
          });

      // If the server picked an item for us (PR3 modes), prefer that for the
      // eventual commit. Verify mode echoes the caller-supplied id back, so
      // this fallback chain is correct in all modes.
      const pending: PendingFind = {
        ...initialPending,
        collectionItemId: outcome.matchedItemId ?? initialPending.collectionItemId ?? null,
        aiModel: outcome.model,
        aiUsage: outcome.usage,
      };
      setState({
        stage: 'done',
        pending,
        validation: outcome.result,
        validationStatus: outcome.status,
        mode: outcome.mode,
        matchedCollectionId: outcome.matchedCollectionId,
        matchedItemId: outcome.matchedItemId,
        candidateItems: outcome.candidateItems,
        candidateCollections: outcome.candidateCollections,
        error: outcome.error,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[capture] failed at stage=${currentStage}`, err);
      setState({
        ...INITIAL,
        stage: 'error',
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
      const collectionItemId = input.collectionItemIdOverride ?? pending.collectionItemId;
      if (!collectionItemId) {
        throw new Error('Nothing to commit — no collection item resolved yet.');
      }
      const find = await createFind({
        userId: input.userId,
        collectionItemId,
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

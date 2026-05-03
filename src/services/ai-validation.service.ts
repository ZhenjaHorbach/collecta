import { ValidationResultSchema, type ValidationResult } from '@schemas';

import { supabase } from './supabase.service';

export type ValidateFindMode = 'verify' | 'match-in-collection' | 'discover';

export interface ApiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ValidationCandidate {
  id: string;
  name: string;
  confidence: number;
}

export interface ValidateFindInput {
  photoUrl: string;
  // Provide one of these; mode is inferred from the combination unless given
  // explicitly. PR1 only implements `verify` (collectionItemId set);
  // match-in-collection / discover return status='vision_failed' with
  // error='mode_not_implemented' until PR3 lands.
  collectionItemId?: string;
  collectionId?: string;
  mode?: ValidateFindMode;
}

export interface ValidateFindOutcome {
  status: 'ok' | 'vision_failed' | 'invoke_failed';
  result: ValidationResult | null;
  mode: ValidateFindMode | null;
  matchedCollectionId: string | null;
  matchedItemId: string | null;
  candidateItems: ValidationCandidate[];
  candidateCollections: ValidationCandidate[];
  // Token usage from the Anthropic call. Returned alongside the result so the
  // client can persist it on the finds row at commit time.
  usage: ApiUsage | null;
  model: string | null;
  error: string | null;
}

function readUsage(raw: unknown): ApiUsage | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Partial<Record<keyof ApiUsage, unknown>>;
  const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
  return {
    inputTokens: num(u.inputTokens),
    outputTokens: num(u.outputTokens),
    cacheReadInputTokens: num(u.cacheReadInputTokens),
    cacheCreationInputTokens: num(u.cacheCreationInputTokens),
  };
}

function readCandidates(raw: unknown): ValidationCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c): ValidationCandidate[] => {
    if (!c || typeof c !== 'object') return [];
    const obj = c as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id : null;
    const name = typeof obj.name === 'string' ? obj.name : null;
    const confidence = typeof obj.confidence === 'number' ? obj.confidence : null;
    if (!id || !name || confidence === null) return [];
    return [{ id, name, confidence: Math.max(0, Math.min(1, confidence)) }];
  });
}

function readString(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null;
}

function readMode(raw: unknown): ValidateFindMode | null {
  return raw === 'verify' || raw === 'match-in-collection' || raw === 'discover' ? raw : null;
}

function emptyOutcome(
  status: ValidateFindOutcome['status'],
  error: string | null
): ValidateFindOutcome {
  return {
    status,
    result: null,
    mode: null,
    matchedCollectionId: null,
    matchedItemId: null,
    candidateItems: [],
    candidateCollections: [],
    usage: null,
    model: null,
    error,
  };
}

// Validates a photo without persisting anything. The caller decides whether
// to commit the result to a finds row (createFind) or discard it.
export async function validateFind(input: ValidateFindInput): Promise<ValidateFindOutcome> {
  const body: Record<string, unknown> = { photo_url: input.photoUrl };
  if (input.collectionItemId) body.collection_item_id = input.collectionItemId;
  if (input.collectionId) body.collection_id = input.collectionId;
  if (input.mode) body.mode = input.mode;

  const { data, error } = await supabase.functions.invoke('validate-find', { body });

  if (error) {
    return emptyOutcome('invoke_failed', error.message);
  }

  // Edge function returns { error: '...', detail? } with HTTP 4xx/5xx —
  // supabase-js surfaces non-2xx as `error` for FunctionsHttpError; the body
  // is delivered via data for FunctionsRelayError. Treat both shapes defensively.
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error?: unknown }).error;
    return emptyOutcome('vision_failed', typeof err === 'string' ? err : 'vision_failed');
  }

  const wrapped = data && typeof data === 'object' && 'result' in data ? data : null;
  const resultPayload = wrapped ? (wrapped as { result: unknown }).result : data;
  const parsed = ValidationResultSchema.safeParse(resultPayload);
  if (!parsed.success) {
    return emptyOutcome('vision_failed', 'malformed_validation_result');
  }

  const w = (wrapped ?? {}) as Record<string, unknown>;
  return {
    status: 'ok',
    result: parsed.data,
    mode: readMode(w.mode),
    matchedCollectionId: readString(w.matched_collection_id),
    matchedItemId: readString(w.matched_item_id),
    candidateItems: readCandidates(w.candidate_items),
    candidateCollections: readCandidates(w.candidate_collections),
    usage: readUsage(w.usage),
    model: readString(w.model),
    error: null,
  };
}

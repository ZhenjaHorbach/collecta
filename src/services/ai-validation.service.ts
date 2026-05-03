import { ValidationResultSchema, type ValidationResult } from '@schemas';

import { supabase } from './supabase.service';

export interface ApiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ValidateFindOutcome {
  status: 'ok' | 'vision_failed' | 'invoke_failed';
  result: ValidationResult | null;
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

// Validates a photo without persisting anything. The caller decides whether
// to commit the result to a finds row (createFind) or discard it.
export async function validateFind(
  photoUrl: string,
  collectionItemId: string
): Promise<ValidateFindOutcome> {
  const { data, error } = await supabase.functions.invoke('validate-find', {
    body: { photo_url: photoUrl, collection_item_id: collectionItemId },
  });

  if (error) {
    return {
      status: 'invoke_failed',
      result: null,
      usage: null,
      model: null,
      error: error.message,
    };
  }

  // Edge function returns { error: '...', detail? } with HTTP 4xx/5xx —
  // supabase-js surfaces non-2xx as `error` for FunctionsHttpError; the body
  // is delivered via data for FunctionsRelayError. Treat both shapes defensively.
  if (data && typeof data === 'object' && 'error' in data) {
    return {
      status: 'vision_failed',
      result: null,
      usage: null,
      model: null,
      error: typeof data.error === 'string' ? data.error : 'vision_failed',
    };
  }

  const wrapped = data && typeof data === 'object' && 'result' in data ? data : null;
  const resultPayload = wrapped ? wrapped.result : data;
  const parsed = ValidationResultSchema.safeParse(resultPayload);
  if (!parsed.success) {
    return {
      status: 'vision_failed',
      result: null,
      usage: null,
      model: null,
      error: 'malformed_validation_result',
    };
  }

  return {
    status: 'ok',
    result: parsed.data,
    usage: wrapped ? readUsage(wrapped.usage) : null,
    model: wrapped && typeof wrapped.model === 'string' ? wrapped.model : null,
    error: null,
  };
}

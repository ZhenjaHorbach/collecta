import { ValidationResultSchema, type ValidationResult } from '@schemas';

import { supabase } from './supabase.service';

export interface ValidateFindOutcome {
  status: 'ok' | 'vision_failed' | 'invoke_failed';
  result: ValidationResult | null;
  error: string | null;
}

export async function validateFind(findId: string): Promise<ValidateFindOutcome> {
  const { data, error } = await supabase.functions.invoke('validate-find', {
    body: { find_id: findId },
  });

  if (error) {
    return { status: 'invoke_failed', result: null, error: error.message };
  }

  // Edge function returns { error: 'vision_failed', ... } with HTTP 502 — supabase-js
  // surfaces non-2xx as `error` for FunctionsHttpError; the body is delivered via data
  // for FunctionsRelayError. Treat both shapes defensively.
  if (data && typeof data === 'object' && 'error' in data) {
    return {
      status: 'vision_failed',
      result: null,
      error: typeof data.error === 'string' ? data.error : 'vision_failed',
    };
  }

  const parsed = ValidationResultSchema.safeParse(data);
  if (!parsed.success) {
    return {
      status: 'vision_failed',
      result: null,
      error: 'malformed_validation_result',
    };
  }

  return { status: 'ok', result: parsed.data, error: null };
}

import type { CollectionCategory } from '@constants/categories';
import type { Database } from '@typings/database';

import { supabase } from './supabase.service';

export type AiGeneratedRarity = Database['public']['Enums']['item_rarity'];

export interface AiGeneratedItem {
  name: string;
  description: string;
  ai_hint: string;
  rarity: AiGeneratedRarity;
  fun_fact: string;
}

export interface AiGeneratedCollection {
  title: string;
  description: string;
  category: CollectionCategory;
  items: AiGeneratedItem[];
}

export type AiGenerationLocale = 'en' | 'ru' | 'pl' | 'uk';

export type AiGenerationErrorCode =
  | 'rate_limited'
  | 'invalid_output'
  | 'network'
  | 'prompt_too_short'
  | 'prompt_too_long'
  | 'unauthorized'
  | 'unknown';

export class AiGenerationError extends Error {
  readonly code: AiGenerationErrorCode;
  readonly used?: number;
  readonly limit?: number;

  constructor(
    code: AiGenerationErrorCode,
    message?: string,
    meta?: { used?: number; limit?: number }
  ) {
    super(message ?? code);
    this.code = code;
    this.used = meta?.used;
    this.limit = meta?.limit;
  }
}

interface FunctionResponseBody {
  draft?: AiGeneratedCollection;
  error?: string;
  used?: number;
  limit?: number;
  message?: string;
}

export async function generateCollection(
  prompt: string,
  locale: AiGenerationLocale
): Promise<AiGeneratedCollection> {
  const trimmed = prompt.trim();
  if (trimmed.length < 3) throw new AiGenerationError('prompt_too_short');
  if (trimmed.length > 500) throw new AiGenerationError('prompt_too_long');

  const { data, error } = await supabase.functions.invoke<FunctionResponseBody>(
    'generate-collection',
    { body: { prompt: trimmed, locale } }
  );

  if (error) {
    const ctx = (error as unknown as { context?: { status?: number } }).context;
    const status = ctx?.status;
    if (status === 401) throw new AiGenerationError('unauthorized', error.message);
    if (status === 429) {
      throw new AiGenerationError('rate_limited', error.message, {
        used: data?.used,
        limit: data?.limit,
      });
    }
    if (status === 502) throw new AiGenerationError('invalid_output', error.message);
    throw new AiGenerationError('network', error.message);
  }

  if (!data?.draft) throw new AiGenerationError('invalid_output', data?.error);
  return data.draft;
}

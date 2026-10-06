// Anthropic client limits for every edge function. Pure constants — no Deno
// globals, no imports — so Node tests can check the latency budget.
//
// Why explicit values: SDK defaults are a 10-minute timeout and 2 retries,
// far beyond the Supabase edge-function request limit, so a hung upstream
// call would be killed by the gateway instead of hitting our own error path.
// Sizing rationale: docs/specs/2-anthropic-timeouts-retries.md.

// Budget for one function invocation. Supabase request idle timeout.
export const EDGE_FUNCTION_LIMIT_MS = 150_000;

// One retry absorbs a transient 429 / 529 / 5xx; more doubles the worst case.
export const ANTHROPIC_MAX_RETRIES = 1;

// Vision calls include the API fetching the photo URL.
export const ANTHROPIC_TIMEOUT_VISION_MS = 30_000;

// Small tool-use turns (award-xp).
export const ANTHROPIC_TIMEOUT_TEXT_MS = 15_000;

// Long structured outputs (generate-collection, up to 4096 output tokens).
export const ANTHROPIC_TIMEOUT_GENERATION_MS = 30_000;

// award-xp loop: don't start a new step after this much time has passed.
export const AWARD_XP_LOOP_BUDGET_MS = 90_000;

// SDK backoff before retry n (0-based) is min(0.5s * 2^n, 8s), minus jitter.
const SDK_MAX_RETRY_DELAY_MS = 8_000;
const SDK_INITIAL_RETRY_DELAY_MS = 500;

// Worst-case wall time of one `messages.create` call: every attempt times
// out, plus the backoff between attempts. Ignores `retry-after` headers.
export function worstCaseCallMs(
  timeoutMs: number,
  maxRetries: number = ANTHROPIC_MAX_RETRIES
): number {
  let backoff = 0;
  for (let n = 0; n < maxRetries; n++) {
    backoff += Math.min(SDK_INITIAL_RETRY_DELAY_MS * 2 ** n, SDK_MAX_RETRY_DELAY_MS);
  }
  return timeoutMs * (maxRetries + 1) + backoff;
}

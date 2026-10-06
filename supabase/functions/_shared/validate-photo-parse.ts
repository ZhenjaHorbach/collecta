// Parser for the validate_photo tool output, shared by the validate-find
// edge function (Deno) and the vision eval client (Node). Pure and
// import-free for the same reason as validate-photo-prompt.ts — see the
// exception in .claude/rules/testing.md.

export interface PhotoVerdict {
  valid: boolean;
  confidence: number;
  detected: string;
  suggestion: string;
}

export interface ParsedValidatePhoto {
  result: PhotoVerdict;
  // Raw model fields the verdict doesn't carry, for logging and evals.
  matchesClaim: boolean | undefined;
  // True when the safety net below replaced the model's `valid`.
  overridden: boolean;
}

// Safety net (c225b22): if the model wrote matches_claim=false but
// valid=true, trust the explicit comparison and override valid. Catches the
// failure mode where the model correctly identifies a mismatch but still
// flips valid=true out of obligation (Warsaw church claimed as the mermaid).
// No matches_claim (older output shape) → keep valid as-is.
export function resolveVerdict(
  valid: boolean,
  matchesClaim: boolean | undefined
): { valid: boolean; overridden: boolean } {
  if (matchesClaim === undefined || matchesClaim === valid) {
    return { valid, overridden: false };
  }
  return { valid: matchesClaim, overridden: true };
}

export function parseValidatePhotoToolUse(content: unknown): ParsedValidatePhoto {
  if (!Array.isArray(content)) throw new Error('Unexpected response shape');
  const block = content.find((b: { type?: string } | null) => b?.type === 'tool_use');
  if (!block) throw new Error('No tool_use block in response');
  const input = (block as { input?: unknown }).input;
  if (!input || typeof input !== 'object') throw new Error('tool_use input missing');
  const r = input as Record<string, unknown>;
  if (
    typeof r.valid !== 'boolean' ||
    typeof r.confidence !== 'number' ||
    typeof r.detected !== 'string' ||
    typeof r.suggestion !== 'string'
  ) {
    throw new Error('tool_use input failed schema check');
  }
  const matchesClaim = typeof r.matches_claim === 'boolean' ? r.matches_claim : undefined;
  const { valid, overridden } = resolveVerdict(r.valid, matchesClaim);
  return {
    result: {
      valid,
      confidence: Math.max(0, Math.min(1, r.confidence)),
      detected: r.detected,
      suggestion: r.suggestion,
    },
    matchesClaim,
    overridden,
  };
}

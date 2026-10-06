// validate_photo tool-output parser. This is the last line of defence
// between the model and the verdict the user sees — pin the c225b22 safety
// net (matches_claim beats valid), clamping, and the error messages that
// surface as `vision_failed` detail.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseValidatePhotoToolUse, resolveVerdict } from '../validate-photo-parse';

it('stays import-free and Deno-free (Node evals import it directly)', () => {
  const source = readFileSync(resolve(__dirname, '../validate-photo-parse.ts'), 'utf8');
  expect(source).not.toMatch(/^\s*import\s/m);
  expect(source).not.toMatch(/\bDeno\./);
});

function toolUse(input: unknown): unknown[] {
  return [
    { type: 'text', text: 'thinking out loud' },
    { type: 'tool_use', id: 'tu_1', name: 'validate_photo', input },
  ];
}

const CHURCH = {
  primary_subject: 'a Gothic red-brick church with two spires',
  detected: 'a Gothic red-brick church with two spires',
  confidence: 0.95,
  suggestion: 'Great shot!',
};

describe('resolveVerdict', () => {
  it('keeps valid when matches_claim agrees or is absent', () => {
    expect(resolveVerdict(true, true)).toEqual({ valid: true, overridden: false });
    expect(resolveVerdict(false, false)).toEqual({ valid: false, overridden: false });
    expect(resolveVerdict(true, undefined)).toEqual({ valid: true, overridden: false });
  });

  it('lets matches_claim win when the two disagree', () => {
    expect(resolveVerdict(true, false)).toEqual({ valid: false, overridden: true });
    expect(resolveVerdict(false, true)).toEqual({ valid: true, overridden: true });
  });
});

describe('parseValidatePhotoToolUse', () => {
  it('passes an agreeing verdict through unchanged', () => {
    const out = parseValidatePhotoToolUse(
      toolUse({ ...CHURCH, matches_claim: false, valid: false, suggestion: 'Not the mermaid.' })
    );
    expect(out).toEqual({
      result: {
        valid: false,
        confidence: 0.95,
        detected: CHURCH.detected,
        suggestion: 'Not the mermaid.',
      },
      matchesClaim: false,
      overridden: false,
    });
  });

  it('overrides the church-as-mermaid false positive to valid=false', () => {
    const out = parseValidatePhotoToolUse(
      toolUse({ ...CHURCH, matches_claim: false, valid: true })
    );
    expect(out.result.valid).toBe(false);
    expect(out.overridden).toBe(true);
    expect(out.matchesClaim).toBe(false);
  });

  it('does not override when matches_claim is missing', () => {
    const out = parseValidatePhotoToolUse(toolUse({ ...CHURCH, valid: true }));
    expect(out.result.valid).toBe(true);
    expect(out.matchesClaim).toBeUndefined();
    expect(out.overridden).toBe(false);
  });

  it('clamps confidence into [0, 1]', () => {
    const high = parseValidatePhotoToolUse(
      toolUse({ ...CHURCH, matches_claim: false, valid: false, confidence: 1.7 })
    );
    const low = parseValidatePhotoToolUse(
      toolUse({ ...CHURCH, matches_claim: false, valid: false, confidence: -0.2 })
    );
    expect(high.result.confidence).toBe(1);
    expect(low.result.confidence).toBe(0);
  });

  it.each([
    ['non-array content', { type: 'tool_use' }, 'Unexpected response shape'],
    ['no tool_use block', [{ type: 'text', text: 'hi' }], 'No tool_use block in response'],
    [
      'missing input',
      [{ type: 'tool_use', id: 'x', name: 'validate_photo' }],
      'tool_use input missing',
    ],
    [
      'wrong field types',
      toolUse({ ...CHURCH, valid: 'yes', matches_claim: false }),
      'tool_use input failed schema check',
    ],
    [
      'missing confidence',
      toolUse({ valid: false, matches_claim: false, detected: 'x', suggestion: 'y' }),
      'tool_use input failed schema check',
    ],
  ])('throws on %s', (_label, content, message) => {
    expect(() => parseValidatePhotoToolUse(content)).toThrow(message);
  });
});

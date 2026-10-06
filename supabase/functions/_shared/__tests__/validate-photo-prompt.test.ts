// validate-photo-prompt is imported by BOTH the Deno edge function and the
// Node eval client. Pin the two things that make that safe: the module stays
// import-free / Deno-free, and the tool contract the parser relies on.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  fillTemplate,
  SYSTEM_INSTRUCTIONS,
  USER_CONTEXT_TEMPLATE,
  VALIDATE_PHOTO_TOOL,
} from '../validate-photo-prompt';

describe('validate-photo-prompt module', () => {
  it('has no imports and no Deno globals (Node imports it directly)', () => {
    const source = readFileSync(resolve(__dirname, '../validate-photo-prompt.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\brequire\(/);
    expect(source).not.toMatch(/\bDeno\./);
  });

  it('requires the reasoning-chain fields the parser and evals read', () => {
    expect(VALIDATE_PHOTO_TOOL.name).toBe('validate_photo');
    expect(VALIDATE_PHOTO_TOOL.input_schema.required).toEqual([
      'primary_subject',
      'matches_claim',
      'valid',
      'confidence',
      'detected',
      'suggestion',
    ]);
    expect(SYSTEM_INSTRUCTIONS).toContain('validate_photo');
  });
});

describe('fillTemplate', () => {
  it('fills known placeholders and blanks unknown ones', () => {
    expect(fillTemplate('{a} and {b}', { a: 'cat' })).toBe('cat and ');
  });

  it('renders every placeholder in the user context template', () => {
    const out = fillTemplate(USER_CONTEXT_TEMPLATE, {
      collection_description: 'Landmarks of Warsaw',
      item_name: 'Warsaw Mermaid statue',
    });
    expect(out).toContain('Collection: Landmarks of Warsaw');
    expect(out).toContain('"Warsaw Mermaid statue"');
    expect(out).not.toMatch(/\{\w+\}/);
  });
});

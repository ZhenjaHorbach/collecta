/// <reference types="jest" />
// Smoke tests for the pure helpers used by the generate-collection edge function.
// The HTTP handler itself runs under Deno and isn't exercised here — these tests
// cover prompt building and the JSON parse + schema validation that produce 502s
// when Claude returns malformed output. End-to-end auth/rate-limit paths require
// a running Supabase emulator and are not covered by Jest.

import {
  buildPrompt,
  extractJson,
  validate,
  CATEGORIES,
  RARITIES,
  type GeneratedCollection,
} from '../validation';

function validItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Tabby cat',
    description: 'Brown striped house cat seen in the streets.',
    ai_hint: 'Photo must clearly show a cat with tabby markings.',
    rarity: 'common',
    fun_fact: 'Tabby pattern is one of the oldest cat coat genes.',
    ...overrides,
  };
}

function validRaw(overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    title: 'Street Cat Breeds',
    description: 'Cats you spot on city streets, from tabbies to Maine Coons.',
    category: 'animals',
    items: Array.from({ length: 10 }, (_, i) => validItem({ name: `Cat ${i + 1}` })),
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('embeds the user input verbatim and resolves locale to language name', () => {
    const out = buildPrompt('cat breeds', 'ru');
    expect(out).toContain('"cat breeds"');
    expect(out).toContain('Russian');
  });

  it('lists every category and rarity option in the schema block', () => {
    const out = buildPrompt('anything', 'en');
    for (const c of CATEGORIES) expect(out).toContain(c);
    for (const r of RARITIES) expect(out).toContain(r);
  });

  it('keeps ai_hint English regardless of user locale', () => {
    const out = buildPrompt('test', 'pl');
    expect(out).toContain('ai_hint stays in English');
  });
});

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    const out = extractJson('{"a":1,"b":[2,3]}');
    expect(out).toEqual({ a: 1, b: [2, 3] });
  });

  it('extracts JSON from markdown fences', () => {
    const out = extractJson('Here is the result:\n```json\n{"x":42}\n```\nthanks');
    expect(out).toEqual({ x: 42 });
  });

  it('extracts JSON from un-tagged code fences', () => {
    const out = extractJson('```\n{"y":"ok"}\n```');
    expect(out).toEqual({ y: 'ok' });
  });

  it('extracts JSON when prose surrounds the object', () => {
    const out = extractJson('Sure! {"z":true} Hope that helps.');
    expect(out).toEqual({ z: true });
  });

  it('throws when no JSON object is present', () => {
    expect(() => extractJson('no json here, sorry')).toThrow(/did not contain a JSON object/i);
  });

  it('throws when JSON is malformed', () => {
    expect(() => extractJson('{ "a": ')).toThrow();
  });
});

describe('validate', () => {
  it('accepts a well-formed collection and returns the typed shape', () => {
    const out: GeneratedCollection = validate(validRaw());
    expect(out.title).toBe('Street Cat Breeds');
    expect(out.category).toBe('animals');
    expect(out.items).toHaveLength(10);
    expect(out.items[0]).toMatchObject({ rarity: 'common' });
  });

  it('rejects non-object input', () => {
    expect(() => validate('not an object')).toThrow(/not an object/i);
    expect(() => validate(null)).toThrow();
  });

  it('rejects an unknown category', () => {
    expect(() => validate(validRaw({ category: 'spaceships' }))).toThrow(/category/);
  });

  it('rejects empty title', () => {
    expect(() => validate(validRaw({ title: '   ' }))).toThrow(/title/);
  });

  it('rejects when items is not an array', () => {
    expect(() => validate(validRaw({ items: 'list' }))).toThrow(/items must be an array/);
  });

  it('rejects when items has fewer than 5 entries', () => {
    expect(() =>
      validate(validRaw({ items: Array.from({ length: 4 }, () => validItem()) }))
    ).toThrow(/at least 5/);
  });

  it('caps items at 20', () => {
    const out = validate(validRaw({ items: Array.from({ length: 30 }, () => validItem()) }));
    expect(out.items).toHaveLength(20);
  });

  it('rejects when an item has an invalid rarity', () => {
    const items = [
      validItem({ rarity: 'mythic' }),
      ...Array.from({ length: 5 }, () => validItem()),
    ];
    expect(() => validate(validRaw({ items }))).toThrow(/rarity/);
  });

  it('rejects when an item is missing ai_hint', () => {
    const items = [
      { name: 'X', description: 'd', rarity: 'common', fun_fact: 'f' },
      ...Array.from({ length: 5 }, () => validItem()),
    ];
    expect(() => validate(validRaw({ items }))).toThrow(/ai_hint/);
  });

  it('truncates over-long string fields rather than throwing', () => {
    const huge = 'a'.repeat(1000);
    const out = validate(
      validRaw({
        title: huge,
        description: huge,
        items: Array.from({ length: 5 }, () =>
          validItem({ name: huge, description: huge, ai_hint: huge, fun_fact: huge })
        ),
      })
    );
    expect(out.title.length).toBeLessThanOrEqual(80);
    expect(out.description.length).toBeLessThanOrEqual(500);
    expect(out.items[0].name.length).toBeLessThanOrEqual(80);
    expect(out.items[0].ai_hint.length).toBeLessThanOrEqual(280);
  });
});

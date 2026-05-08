// Locale-key parity guard. Per .claude/rules/code-style.md: en.json is the
// source of truth; every key must exist in ru/pl/uk with a string value.
// Missing keys silently fall back to English at runtime, which counts as
// incomplete localisation — this test makes that failure loud at CI time.
//
// i18next CLDR plural suffixes are language-specific: en has `_one`/`_other`,
// Slavic locales need `_one`/`_few`/`_many`/`_other`. We compare *plural
// families* (the prefix before the suffix) — locale-specific plural variants
// count as a match for the family rather than as extras.

import en from '../locales/en.json';
import pl from '../locales/pl.json';
import ru from '../locales/ru.json';
import uk from '../locales/uk.json';

type JsonValue = string | { [k: string]: JsonValue };

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

// Returns the family stem (key without plural suffix) when the key is part of
// a CLDR plural family, else null.
function pluralStem(key: string): string | null {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length);
  }
  return null;
}

function leafKeys(obj: JsonValue, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k));
}

function getByPath(obj: JsonValue, path: string): JsonValue | undefined {
  const parts = path.split('.');
  let cur: JsonValue | undefined = obj;
  for (const p of parts) {
    if (cur === undefined || typeof cur === 'string') return undefined;
    cur = cur[p];
  }
  return cur;
}

const enKeys = leafKeys(en as JsonValue);
const enPluralStems = new Set(enKeys.map(pluralStem).filter((s): s is string => s !== null));
const enNonPluralKeys = enKeys.filter((k) => pluralStem(k) === null);

const locales: [string, JsonValue][] = [
  ['ru', ru as JsonValue],
  ['pl', pl as JsonValue],
  ['uk', uk as JsonValue],
];

describe('i18n locale parity', () => {
  it('en.json contains a non-trivial number of keys (sanity)', () => {
    expect(enKeys.length).toBeGreaterThan(100);
  });

  it.each(locales)('%s.json has every non-plural key from en.json', (name, data) => {
    const missing: string[] = [];
    const wrongType: string[] = [];
    for (const key of enNonPluralKeys) {
      const v = getByPath(data, key);
      if (v === undefined) missing.push(key);
      else if (typeof v !== 'string') wrongType.push(key);
    }
    if (missing.length || wrongType.length) {
      const lines = [
        `Locale ${name}.json is out of sync with en.json:`,
        missing.length
          ? `  Missing (${missing.length}): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ', …' : ''}`
          : '',
        wrongType.length
          ? `  Non-string (${wrongType.length}): ${wrongType.slice(0, 10).join(', ')}${wrongType.length > 10 ? ', …' : ''}`
          : '',
      ].filter(Boolean);
      throw new Error(lines.join('\n'));
    }
    expect(missing).toEqual([]);
    expect(wrongType).toEqual([]);
  });

  it.each(locales)('%s.json covers every plural family from en.json', (name, data) => {
    const localeKeys = leafKeys(data);
    const localeStems = new Set(localeKeys.map(pluralStem).filter((s): s is string => s !== null));
    const missingFamilies = [...enPluralStems].filter((s) => !localeStems.has(s));
    if (missingFamilies.length) {
      throw new Error(
        `Locale ${name}.json is missing plural families: ${missingFamilies.join(', ')}.\n` +
          `Each family needs at least the locale's _one and _other variants ` +
          `(Slavic locales typically also need _few and _many).`
      );
    }
  });

  it.each(locales)('%s.json does not have keys absent in en.json', (name, data) => {
    const localeKeys = leafKeys(data);
    const extras = localeKeys.filter((k) => {
      const stem = pluralStem(k);
      // Plural variants are allowed if they belong to an en plural family.
      if (stem !== null && enPluralStems.has(stem)) return false;
      return !enKeys.includes(k);
    });
    if (extras.length) {
      throw new Error(
        `Locale ${name}.json has ${extras.length} extra key(s) not in en.json: ` +
          `${extras.slice(0, 10).join(', ')}${extras.length > 10 ? ', …' : ''}\n` +
          `en.json is the source of truth — either add to en.json or remove from ${name}.json.`
      );
    }
  });
});

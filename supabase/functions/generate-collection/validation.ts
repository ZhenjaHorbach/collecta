// Pure helpers for the generate-collection edge function.
// Kept free of Deno / npm specifiers so they're testable from Jest.

export const CATEGORIES = [
  'nature',
  'urban',
  'animals',
  'food',
  'transport',
  'art',
  'sports',
  'visual',
  'seasonal',
  'travel',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const RARITIES = ['common', 'uncommon', 'rare'] as const;
export type Rarity = (typeof RARITIES)[number];

export const LOCALES = ['en', 'ru', 'pl', 'uk'] as const;
export type Locale = (typeof LOCALES)[number];

export const LANGUAGE_NAME: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  pl: 'Polish',
  uk: 'Ukrainian',
};

export interface GeneratedItem {
  name: string;
  description: string;
  ai_hint: string;
  rarity: Rarity;
  fun_fact: string;
}

export interface GeneratedCollection {
  title: string;
  description: string;
  category: Category;
  items: GeneratedItem[];
}

export function buildPrompt(userInput: string, locale: Locale): string {
  return `User wants to create a real-world photo collection about: "${userInput}"

Generate a complete collection structure as a single JSON object with this exact shape:
{
  "title": "short catchy title (under 50 chars)",
  "description": "2-3 sentences explaining what this collection is about",
  "category": "one of: ${CATEGORIES.join('|')}",
  "items": [
    {
      "name": "item name (under 60 chars)",
      "description": "what to look for, one sentence",
      "ai_hint": "instruction for AI photo validation — what must be visible in the frame",
      "rarity": "one of: ${RARITIES.join('|')}",
      "fun_fact": "one short, interesting fact"
    }
  ]
}

Rules:
- Generate between 10 and 20 items.
- All user-facing text (title, description, items[].name/description/fun_fact) must be in ${LANGUAGE_NAME[locale]}.
- ai_hint stays in English so a downstream model can parse it consistently.
- Be specific, fun, and realistically photographable in the real world.
- Output only the JSON object — no prose, no markdown fences.`;
}

export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model output did not contain a JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function asString(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string') throw new Error(`${field} must be a string`);
  const s = v.trim();
  if (s.length === 0) throw new Error(`${field} must not be empty`);
  return s.slice(0, max);
}

function asEnum<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
}

export function validate(raw: unknown): GeneratedCollection {
  if (!raw || typeof raw !== 'object') throw new Error('Output is not an object');
  const obj = raw as Record<string, unknown>;
  const title = asString(obj.title, 'title', 80);
  const description = asString(obj.description, 'description', 500);
  const category = asEnum(obj.category, 'category', CATEGORIES);
  if (!Array.isArray(obj.items)) throw new Error('items must be an array');
  if (obj.items.length < 5) throw new Error('items must contain at least 5 entries');

  const items: GeneratedItem[] = obj.items.slice(0, 20).map((rawItem, i) => {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error(`items[${i}] must be an object`);
    }
    const item = rawItem as Record<string, unknown>;
    return {
      name: asString(item.name, `items[${i}].name`, 80),
      description: asString(item.description, `items[${i}].description`, 280),
      ai_hint: asString(item.ai_hint, `items[${i}].ai_hint`, 280),
      rarity: asEnum(item.rarity, `items[${i}].rarity`, RARITIES),
      fun_fact: asString(item.fun_fact, `items[${i}].fun_fact`, 280),
    };
  });

  return { title, description, category, items };
}

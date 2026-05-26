// Cron-driven collection generator. Runs weekly via GitHub Actions:
//   1. A topic-picker turn asks Claude to propose a fresh theme that doesn't
//      duplicate the existing catalog.
//   2. The hub-and-spoke multi-agent library (src/agents/) generates
//      title + description + N items with descriptions / ai_hints / rarity /
//      fun_facts.
//   3. The merged result is rendered as a SQL migration that inserts under
//      the system user. The workflow opens a PR; merging triggers
//      deploy-supabase.yml which applies it.
//
// Mirrors generate-achievement.ts in shape: no DB writes happen here, the
// migration file is the artifact.
//
// Env:
//   ANTHROPIC_API_KEY        — Claude API key (required)
//   SUPABASE_URL             — for fetching existing catalog (required)
//   SUPABASE_ANON_KEY        — anon read of public.collections (required)
//   COLLECTION_OUT_DIR       — override migrations dir (default supabase/migrations)
//   COLLECTION_DRY_RUN       — '1' = print migration to stdout, don't write file

import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { createClient } from '@supabase/supabase-js';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { COLLECTION_CATEGORIES, type CollectionCategory } from '../src/constants/categories';
import { runCoordinator } from '../src/agents/coordinator';
import { fetchExampleImagesForNames } from '../src/agents/image-fetcher';
import { mirrorImagesByName } from '../src/agents/image-mirror';
import { mergeAndValidate, type MergedCollection } from '../src/agents/merge';
import { runDescriptions } from '../src/agents/subagent-descriptions';
import { runFunFacts } from '../src/agents/subagent-funfact';
import { runImageQueryRewriter } from '../src/agents/subagent-image-query';
import { runRarity } from '../src/agents/subagent-rarity';
import { runValidationHints } from '../src/agents/subagent-validation';
import { sumUsage, type NormalizedUsage } from '../src/agents/types';

const TOPIC_MODEL = 'claude-haiku-4-5-20251001';
const AGENT_MODEL = 'claude-haiku-4-5-20251001';
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const REPO_ROOT = resolve(__dirname, '..');

interface ApiUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

interface TopicProposal {
  topic: string;
  category: CollectionCategory;
  count: number;
  rationale: string;
}

interface ExistingCollection {
  id: string;
  title: string;
  description: string | null;
  category: CollectionCategory | null;
}

const PROPOSE_TOPIC_TOOL: Tool = {
  name: 'propose_collection_topic',
  description:
    'Return a fresh starter-collection topic that does not duplicate the existing catalog.',
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', minLength: 5, maxLength: 60 },
      category: { type: 'string', enum: [...COLLECTION_CATEGORIES] },
      count: { type: 'integer', minimum: 10, maximum: 25 },
      rationale: { type: 'string', minLength: 12, maxLength: 400 },
    },
    required: ['topic', 'category', 'count', 'rationale'],
  },
};

async function loadSystemPrompt(): Promise<string> {
  return readFile(resolve(__dirname, 'generate-collection.prompt.md'), 'utf8');
}

export async function fetchExistingCatalog(): Promise<ExistingCollection[]> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }
  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('collections')
    .select('id, title, description, category')
    .eq('creator_id', SYSTEM_USER_ID)
    .eq('is_public', true)
    .order('category', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ExistingCollection[];
}

function renderCatalogContext(existing: ExistingCollection[]): string {
  if (existing.length === 0) {
    return 'The system catalog is currently empty — propose any photographable theme.';
  }
  const lines = existing.map(
    (c) => `- [${c.category ?? '?'}] ${c.title}${c.description ? ` — ${c.description}` : ''}`
  );
  return `Existing system catalog (${existing.length} collections):\n${lines.join('\n')}`;
}

async function proposeTopic(
  anthropic: Anthropic,
  existing: ExistingCollection[]
): Promise<{ proposal: TopicProposal; usage: ApiUsage }> {
  const systemPrompt = await loadSystemPrompt();
  const message = await anthropic.messages.create({
    model: TOPIC_MODEL,
    max_tokens: 1024,
    tools: [PROPOSE_TOPIC_TOOL],
    tool_choice: { type: 'tool', name: PROPOSE_TOPIC_TOOL.name },
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: renderCatalogContext(existing) }],
  });
  const proposal = parseTopic(message.content);
  validateTopicAgainstCatalog(proposal, existing);
  return {
    proposal,
    usage: {
      input_tokens: message.usage.input_tokens ?? 0,
      output_tokens: message.usage.output_tokens ?? 0,
      cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: message.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

function parseTopic(content: unknown): TopicProposal {
  if (!Array.isArray(content)) throw new Error('topic: unexpected response shape');
  const block = content.find((b: { type?: string }) => b?.type === 'tool_use');
  if (!block) throw new Error('topic: no tool_use block');
  const input = (block as { input?: unknown }).input;
  if (!input || typeof input !== 'object') throw new Error('topic: tool_use input missing');
  const r = input as Partial<TopicProposal>;
  if (
    typeof r.topic !== 'string' ||
    typeof r.category !== 'string' ||
    typeof r.count !== 'number' ||
    typeof r.rationale !== 'string'
  ) {
    throw new Error('topic: tool input failed schema check');
  }
  if (!(COLLECTION_CATEGORIES as readonly string[]).includes(r.category)) {
    throw new Error(`topic: category out of allowlist: ${r.category}`);
  }
  return {
    topic: r.topic.trim(),
    category: r.category as CollectionCategory,
    count: Math.round(r.count),
    rationale: r.rationale.trim(),
  };
}

// Cross-checks Claude's proposal against the live catalog. Catches the cases
// the JSON schema can't: title near-duplicate after lowercasing/normalising.
export function validateTopicAgainstCatalog(
  proposal: TopicProposal,
  existing: ExistingCollection[]
): void {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const proposed = norm(proposal.topic);
  for (const c of existing) {
    if (norm(c.title).includes(proposed) || proposed.includes(norm(c.title))) {
      throw new Error(`topic "${proposal.topic}" overlaps existing "${c.title}"`);
    }
  }
}

export interface GenerateResult {
  topic: TopicProposal;
  collection: MergedCollection;
  usage: ApiUsage;
  model: string;
}

export async function generateCollection(): Promise<GenerateResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const existing = await fetchExistingCatalog();
  const { proposal, usage: topicUsage } = await proposeTopic(anthropic, existing);

  // Reuse the multi-agent library that powered the initial seed run.
  const coord = await runCoordinator(anthropic, AGENT_MODEL, {
    topic: proposal.topic,
    category: proposal.category,
    count: proposal.count,
    locale: 'en',
  });
  // 5 LLM subagents in parallel. The image-query subagent rewrites
  // descriptive item names into tight Wikipedia/Unsplash search queries
  // BEFORE the HTTP fetch step that follows.
  const [descs, hints, rarity, facts, queries] = await Promise.all([
    runDescriptions(anthropic, AGENT_MODEL, coord.plan.title, coord.plan.itemNames, 'en'),
    runValidationHints(anthropic, AGENT_MODEL, coord.plan.title, coord.plan.itemNames),
    runRarity(anthropic, AGENT_MODEL, coord.plan.title, coord.plan.itemNames),
    runFunFacts(anthropic, AGENT_MODEL, coord.plan.title, coord.plan.itemNames, 'en'),
    runImageQueryRewriter(anthropic, AGENT_MODEL, coord.plan.title, coord.plan.itemNames),
  ]);

  // Image fetch with the rewritten queries. Pure HTTP, no Anthropic.
  const imagesByName = await fetchImagesByName(coord.plan.itemNames, queries.byName);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mirrored =
    supabaseUrl && serviceRoleKey
      ? await mirrorImagesByName(imagesByName, { supabaseUrl, serviceRoleKey })
      : imagesByName;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      '[generate-collection] SUPABASE_SERVICE_ROLE_KEY missing — skipping image mirror, external URLs will be saved as-is'
    );
  }
  const merged = mergeAndValidate(
    coord.plan,
    descs.data,
    hints.data,
    rarity.data,
    facts.data,
    mirrored
  );

  const aggregate: NormalizedUsage = sumUsage(
    coord.usage,
    descs.usage,
    hints.usage,
    rarity.usage,
    facts.usage,
    queries.usage
  );
  const usage: ApiUsage = {
    input_tokens: topicUsage.input_tokens + aggregate.input_tokens,
    output_tokens: topicUsage.output_tokens + aggregate.output_tokens,
    cache_read_input_tokens: topicUsage.cache_read_input_tokens + aggregate.cache_read_tokens,
    cache_creation_input_tokens:
      topicUsage.cache_creation_input_tokens + aggregate.cache_creation_tokens,
  };

  return { topic: proposal, collection: merged, usage, model: AGENT_MODEL };
}

// Maps each item name → image URL via the rewritten search query. Wraps
// fetchExampleImagesForNames to remap the result back from query-key to
// name-key so downstream merge works on names, not queries.
async function fetchImagesByName(
  names: readonly string[],
  queryByName: Record<string, string>
): Promise<Record<string, string | null>> {
  const queries = names.map((n) => queryByName[n] ?? n);
  const byQuery = await fetchExampleImagesForNames(queries);
  const out: Record<string, string | null> = {};
  for (const name of names) {
    const q = queryByName[name] ?? name;
    out[name] = byQuery[q] ?? null;
  }
  return out;
}

async function nextMigrationNumber(): Promise<string> {
  const dir = process.env.COLLECTION_OUT_DIR ?? resolve(REPO_ROOT, 'supabase/migrations');
  const entries = await readdir(dir);
  const nums = entries
    .map((f) => /^(\d{3})_/.exec(f)?.[1])
    .filter((n): n is string => Boolean(n))
    .map((n) => parseInt(n, 10));
  const next = (nums.length === 0 ? 0 : Math.max(...nums)) + 1;
  return next.toString().padStart(3, '0');
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

function renderItemValues(items: MergedCollection['items']): string {
  return items
    .map((item, i) => {
      const fields = [
        `'${escapeSql(item.name)}'`,
        `'${escapeSql(item.description)}'`,
        `'${escapeSql(item.ai_hint)}'`,
        `'${item.rarity}'::public.item_rarity`,
        item.fun_fact ? `'${escapeSql(item.fun_fact)}'` : 'null',
        item.example_image_url ? `'${escapeSql(item.example_image_url)}'` : 'null',
        i.toString(),
      ];
      return `    (${fields.join(', ')})`;
    })
    .join(',\n');
}

function renderMigrationSql(g: GenerateResult): string {
  const { collection: c, topic, usage, model } = g;
  // Pick the first non-null item image as the collection cover. Free —
  // saves an extra lookup dedicated to the cover.
  const coverUrl = c.items.find((i) => i.example_image_url)?.example_image_url ?? null;
  const coverSql = coverUrl ? `'${escapeSql(coverUrl)}'` : 'null';
  return `-- Migration: collection_${slug(c.title)}
-- Auto-generated by scripts/generate-collection.ts (multi-agent pipeline).
-- Review the title, item names, and ai_hints before merging — Claude can be
-- fooled into proposing a near-duplicate of an existing collection that the
-- normalised name check missed.
--
-- Topic rationale: ${topic.rationale.replace(/\n/g, ' ')}
-- Generation: model=${model} input=${usage.input_tokens} output=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens} cache_write=${usage.cache_creation_input_tokens}
--
-- Idempotent — relies on collections_system_title_uniq (migration 015).
-- Re-applying skips the collection insert and is a no-op (items insert is
-- gated on the new id, so it only fires when the parent insert succeeded).
--
-- Rollback:
--   delete from public.collections
--    where creator_id = '${SYSTEM_USER_ID}' and title = '${escapeSql(c.title)}';

with new_coll as (
  insert into public.collections (
    creator_id, title, description, category, cover_image_url, is_public, is_freeform
  )
  values (
    '${SYSTEM_USER_ID}',
    '${escapeSql(c.title)}',
    '${escapeSql(c.description)}',
    '${c.category}'::public.collection_category,
    ${coverSql},
    true,
    false
  )
  on conflict (creator_id, title) do nothing
  returning id
)
insert into public.collection_items (
  collection_id, name, description, ai_validation_prompt, rarity, fun_fact, example_image_url, sort_order
)
select new_coll.id, x.name, x.description, x.ai_validation_prompt, x.rarity, x.fun_fact, x.example_image_url, x.sort_order
from new_coll
cross join (values
${renderItemValues(c.items)}
) as x(name, description, ai_validation_prompt, rarity, fun_fact, example_image_url, sort_order);
`;
}

async function main(): Promise<void> {
  const result = await generateCollection();
  const sql = renderMigrationSql(result);

  if (process.env.COLLECTION_DRY_RUN === '1') {
    process.stdout.write(sql);
    process.stderr.write(
      `\n[dry-run] topic: ${JSON.stringify(result.topic)}\n` +
        `[dry-run] title: ${result.collection.title}\n` +
        `[dry-run] items: ${result.collection.items.length}\n` +
        `[dry-run] usage: ${JSON.stringify(result.usage)}\n`
    );
    return;
  }

  const dir = process.env.COLLECTION_OUT_DIR ?? resolve(REPO_ROOT, 'supabase/migrations');
  const num = await nextMigrationNumber();
  const path = resolve(dir, `${num}_collection_${slug(result.collection.title)}.sql`);
  await writeFile(path, sql, 'utf8');

  // Stdout consumed by the workflow to populate PR title/body.
  process.stdout.write(
    JSON.stringify({
      file: path,
      title: result.collection.title,
      category: result.collection.category,
      item_count: result.collection.items.length,
      topic: result.topic.topic,
      rationale: result.topic.rationale,
      usage: result.usage,
      model: result.model,
    }) + '\n'
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

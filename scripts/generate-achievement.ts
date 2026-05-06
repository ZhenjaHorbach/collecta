// Cron-driven achievement generator. Runs weekly via GitHub Actions, calls
// Claude with the system prompt in generate-achievement.prompt.md (sibling), and
// writes a new SQL migration into supabase/migrations/. The workflow then
// opens a PR; merging triggers deploy-supabase.yml which applies the
// migration. No DB writes happen here — the migration is the artifact.
//
// Also exported as `generateAchievement(...)` so the eval harness can drive
// the same code path without shelling out.
//
// Env:
//   ANTHROPIC_API_KEY        — Claude API key (required)
//   SUPABASE_URL             — for fetching existing catalog (required)
//   SUPABASE_ANON_KEY        — anon read of public.achievements (required)
//   ACHIEVEMENT_OUT_DIR      — override migrations dir (default supabase/migrations)
//   ACHIEVEMENT_DRY_RUN      — '1' = print migration to stdout, don't write file

import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { createClient } from '@supabase/supabase-js';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'claude-haiku-4-5-20251001';
const REPO_ROOT = resolve(__dirname, '..');

const ALLOWED_KINDS = [
  'finds_count',
  'streak_days',
  'reactions_given',
  'collections_complete',
] as const;
type ConditionKind = (typeof ALLOWED_KINDS)[number];

export interface ProposedAchievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition: { kind: ConditionKind; gte: number };
  sort_order: number;
}

interface ExistingAchievement {
  code: string;
  title: string;
  icon: string;
  xp_reward: number;
  condition: { kind: string; gte: number };
  sort_order: number;
}

interface ApiUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

const PROPOSE_TOOL: Tool = {
  name: 'propose_achievement',
  description: 'Return the structured achievement proposal.',
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', minLength: 3, maxLength: 40 },
      title: { type: 'string', minLength: 2, maxLength: 32 },
      description: { type: 'string', minLength: 12, maxLength: 120 },
      icon: { type: 'string', minLength: 1, maxLength: 8 },
      xp_reward: { type: 'integer', minimum: 20, maximum: 200 },
      condition: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: [...ALLOWED_KINDS] },
          gte: { type: 'integer', minimum: 1 },
        },
        required: ['kind', 'gte'],
      },
      sort_order: { type: 'integer', minimum: 0 },
    },
    required: ['code', 'title', 'description', 'icon', 'xp_reward', 'condition', 'sort_order'],
  },
};

async function loadSystemPrompt(): Promise<string> {
  return readFile(resolve(__dirname, 'generate-achievement.prompt.md'), 'utf8');
}

export async function fetchExistingCatalog(): Promise<ExistingAchievement[]> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }
  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('achievements')
    .select('code, title, icon, xp_reward, condition, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ExistingAchievement[];
}

function renderCatalogContext(existing: ExistingAchievement[]): string {
  if (existing.length === 0) return 'The catalog is currently empty.';
  const lines = existing.map(
    (a) =>
      `- ${a.code} | ${a.icon} ${a.title} | xp=${a.xp_reward} | ${a.condition.kind} >= ${a.condition.gte} | sort=${a.sort_order}`
  );
  return `Current catalog (${existing.length} achievements):\n${lines.join('\n')}`;
}

export interface GenerateResult {
  achievement: ProposedAchievement;
  usage: ApiUsage;
  model: string;
}

export async function generateAchievement(): Promise<GenerateResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const [systemPrompt, existing] = await Promise.all([loadSystemPrompt(), fetchExistingCatalog()]);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [PROPOSE_TOOL],
    tool_choice: { type: 'tool', name: PROPOSE_TOOL.name },
    // Cache the (stable) system prompt — only the catalog changes between
    // runs, so this lets the writes go in the cached prefix on the second
    // run within the 5-min TTL (e.g. eval suite re-runs).
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: renderCatalogContext(existing) }],
  });

  const proposed = parseToolUse(message.content);
  validateAgainstCatalog(proposed, existing);

  const u = message.usage;
  return {
    achievement: proposed,
    model: MODEL,
    usage: {
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
    },
  };
}

function parseToolUse(content: unknown): ProposedAchievement {
  if (!Array.isArray(content)) throw new Error('unexpected response shape');
  const block = content.find((b: { type?: string }) => b?.type === 'tool_use');
  if (!block) throw new Error('no tool_use block in response');
  const input = (block as { input?: unknown }).input;
  if (!input || typeof input !== 'object') throw new Error('tool_use input missing');
  const r = input as Partial<ProposedAchievement>;
  if (
    typeof r.code !== 'string' ||
    typeof r.title !== 'string' ||
    typeof r.description !== 'string' ||
    typeof r.icon !== 'string' ||
    typeof r.xp_reward !== 'number' ||
    !r.condition ||
    typeof r.condition !== 'object' ||
    typeof r.sort_order !== 'number'
  ) {
    throw new Error('tool_use input failed schema check');
  }
  const kind = r.condition.kind as ConditionKind;
  if (!ALLOWED_KINDS.includes(kind)) {
    throw new Error(`condition.kind out of allowlist: ${kind}`);
  }
  if (typeof r.condition.gte !== 'number' || r.condition.gte < 1) {
    throw new Error(`condition.gte must be a positive integer; got ${r.condition.gte}`);
  }
  return {
    code: r.code,
    title: r.title,
    description: r.description,
    icon: r.icon,
    xp_reward: Math.round(r.xp_reward),
    condition: { kind, gte: Math.round(r.condition.gte) },
    sort_order: Math.round(r.sort_order),
  };
}

// Cross-checks Claude's output against the live catalog. Catches the cases
// the JSON schema can't: code collision, threshold not advancing, icon reuse.
export function validateAgainstCatalog(
  proposed: ProposedAchievement,
  existing: ExistingAchievement[]
): void {
  if (existing.some((a) => a.code === proposed.code)) {
    throw new Error(`code "${proposed.code}" already exists in catalog`);
  }
  if (existing.some((a) => a.icon === proposed.icon)) {
    // Soft constraint per the prompt — promote to hard so we never ship dups.
    throw new Error(`icon "${proposed.icon}" already used in catalog`);
  }
  const sameKind = existing.filter((a) => a.condition.kind === proposed.condition.kind);
  for (const a of sameKind) {
    if (a.condition.gte === proposed.condition.gte) {
      throw new Error(
        `condition ${proposed.condition.kind} gte=${proposed.condition.gte} duplicates ${a.code}`
      );
    }
  }
}

async function nextMigrationNumber(): Promise<string> {
  const dir = process.env.ACHIEVEMENT_OUT_DIR ?? resolve(REPO_ROOT, 'supabase/migrations');
  const entries = await readdir(dir);
  const nums = entries
    .map((f) => /^(\d{3})_/.exec(f)?.[1])
    .filter((n): n is string => Boolean(n))
    .map((n) => parseInt(n, 10));
  const next = (nums.length === 0 ? 0 : Math.max(...nums)) + 1;
  return next.toString().padStart(3, '0');
}

function renderMigrationSql(a: ProposedAchievement): string {
  const condJson = JSON.stringify(a.condition);
  return `-- Migration: achievement_${a.code}
-- Auto-generated by scripts/generate-achievement.ts. Review the proposal in
-- the PR description before merging — Claude can be fooled into proposing
-- duplicates the cross-check missed (e.g. semantic dup with a different code).
--
-- Rollback:
--   delete from public.achievements where code = '${a.code}';

insert into public.achievements (code, title, description, icon, xp_reward, condition, sort_order)
values (
  '${escapeSql(a.code)}',
  '${escapeSql(a.title)}',
  '${escapeSql(a.description)}',
  '${escapeSql(a.icon)}',
  ${a.xp_reward},
  '${condJson}'::jsonb,
  ${a.sort_order}
)
on conflict (code) do update
  set title       = excluded.title,
      description = excluded.description,
      icon        = excluded.icon,
      xp_reward   = excluded.xp_reward,
      condition   = excluded.condition,
      sort_order  = excluded.sort_order;
`;
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

async function main(): Promise<void> {
  const result = await generateAchievement();
  const sql = renderMigrationSql(result.achievement);

  if (process.env.ACHIEVEMENT_DRY_RUN === '1') {
    process.stdout.write(sql);
    process.stderr.write(
      `\n[dry-run] proposal: ${JSON.stringify(result.achievement)}\n` +
        `[dry-run] usage: ${JSON.stringify(result.usage)}\n`
    );
    return;
  }

  const dir = process.env.ACHIEVEMENT_OUT_DIR ?? resolve(REPO_ROOT, 'supabase/migrations');
  const num = await nextMigrationNumber();
  const path = resolve(dir, `${num}_achievement_${result.achievement.code}.sql`);
  await writeFile(path, sql, 'utf8');

  // Stdout consumed by the workflow to populate PR title/body.
  process.stdout.write(
    JSON.stringify({
      file: path,
      achievement: result.achievement,
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

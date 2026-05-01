import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { aiValidationCases } from './ai-validation.eval';
import { callValidate } from './client';
import { buildReport } from './report';
import type { EvalCase, EvalContext } from './types';

const SUITES: Record<string, EvalCase[]> = {
  'ai-validation': aiValidationCases,
};

interface CliArgs {
  suite: string;
  out: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let suite = 'all';
  let out = 'eval-results/report.json';
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--suite') suite = args[++i] ?? 'all';
    else if (arg === '--out') out = args[++i] ?? out;
  }
  return { suite, out };
}

function fixtureUrlFactory(): (name: string) => string {
  const base = process.env.FEW_SHOT_FIXTURES_BASE_URL;
  if (!base) {
    throw new Error(
      'FEW_SHOT_FIXTURES_BASE_URL is required for evals. ' +
        'Upload src/evals/fixtures/* to a public Supabase Storage bucket and set the env var to the base URL.'
    );
  }
  return (name) => `${base.replace(/\/$/, '')}/${name}`;
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  const ctx: EvalContext = {
    fixtureUrl: fixtureUrlFactory(),
    validate: async (photoUrl, collectionDescription, itemName) => {
      const { result, durationMs } = await callValidate(photoUrl, collectionDescription, itemName);
      return { result, durationMs };
    },
  };

  const targetSuites =
    args.suite === 'all' ? Object.keys(SUITES) : [args.suite].filter((s) => s in SUITES);
  if (targetSuites.length === 0) {
    throw new Error(`Unknown suite: ${args.suite}. Available: ${Object.keys(SUITES).join(', ')}`);
  }

  for (const suiteName of targetSuites) {
    console.log(`▶ running suite: ${suiteName}`);
    const startedAt = new Date().toISOString();
    const cases = SUITES[suiteName];
    const results = [];
    for (const c of cases) {
      try {
        const r = await c.run(ctx);
        console.log(`  ${r.passed ? '✓' : '✗'} ${r.name} (${r.durationMs}ms)`);
        if (!r.passed && r.reason) console.log(`    ↳ ${r.reason}`);
        results.push(r);
      } catch (err) {
        console.log(`  ✗ ${c.name} threw: ${err instanceof Error ? err.message : String(err)}`);
        results.push({
          name: c.name,
          passed: false,
          durationMs: 0,
          parsed: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const report = buildReport(suiteName, startedAt, results);
    const outPath = resolve(process.cwd(), args.out.replace('.json', `.${suiteName}.json`));
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(report, null, 2));
    console.log(
      `  → ${outPath}\n  accuracy=${(report.accuracy * 100).toFixed(1)}% format=${(report.formatComplianceRate * 100).toFixed(1)}% avg=${report.avgLatencyMs.toFixed(0)}ms p95=${report.p95LatencyMs.toFixed(0)}ms`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

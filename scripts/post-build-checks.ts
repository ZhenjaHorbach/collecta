// Post-build sanity checks.
//
// Runs after `expo export` (the web bundle target — same export EAS Hosting
// deploys). Caps bundle size, scans for accidentally-committed secrets in
// `src/`, asserts strict TypeScript, and appends a one-line build-metrics
// JSON to `.build-metrics.jsonl` for trend tracking.
//
// Failure semantics: any check that fails exits non-zero with a `::error::`
// line so GitHub Actions surfaces it inline. The metrics line is appended
// even on failure so we can plot regressions over time.

import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = process.env.DIST_DIR ?? 'dist';
const MAX_BUNDLE_MB = Number(process.env.MAX_BUNDLE_MB ?? 50);
const METRICS_FILE = '.build-metrics.jsonl';

let failed = false;

function fail(msg: string): void {
  console.error(`::error::${msg}`);
  failed = true;
}

function dirSizeBytes(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(p);
    else if (entry.isFile()) total += statSync(p).size;
  }
  return total;
}

function checkBundleSize(): number {
  if (!existsSync(DIST_DIR)) {
    fail(`bundle dir ${DIST_DIR} not found — run \`expo export\` first`);
    return 0;
  }
  const bytes = dirSizeBytes(DIST_DIR);
  const mb = bytes / 1024 / 1024;
  if (mb > MAX_BUNDLE_MB) {
    fail(`bundle ${mb.toFixed(1)}MB exceeds cap ${MAX_BUNDLE_MB}MB`);
  } else {
    console.log(`[post-build] bundle size ${mb.toFixed(1)}MB (cap ${MAX_BUNDLE_MB}MB)`);
  }
  return Math.round(mb * 100) / 100;
}

// Detect long-form secrets that pattern-match well-known formats. We DO NOT
// scan the bundle (`dist/`) — the web build is allowed to inline
// EXPO_PUBLIC_* keys (Supabase anon, Google Maps) by design. Secrets we
// care about are service-role / Anthropic keys, and those should never
// land in `src/`.
function checkSecrets(): void {
  const patterns: { name: string; re: RegExp }[] = [
    { name: 'Anthropic API key', re: /sk-ant-[a-zA-Z0-9_-]{20,}/ },
    {
      name: 'Supabase service-role JWT',
      re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    },
    { name: 'Generic AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  ];

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        out.push(...walk(p));
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json|md|sql|sh)$/.test(entry.name)) {
        out.push(p);
      }
    }
    return out;
  }

  const files = walk('src').concat(walk('supabase')).concat(walk('scripts'));
  let hits = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const { name, re } of patterns) {
      const m = text.match(re);
      if (m) {
        fail(`possible ${name} leaked in ${file}: ${m[0].slice(0, 12)}…`);
        hits += 1;
      }
    }
  }
  if (hits === 0) console.log('[post-build] secret scan clean');
}

function checkStrictTypes(): void {
  try {
    execSync('npx tsc --noEmit --strict', { stdio: 'inherit' });
    console.log('[post-build] strict typecheck clean');
  } catch {
    fail('strict TypeScript check failed');
  }
}

function appendMetrics(bundleMb: number): void {
  const line =
    JSON.stringify({
      ts: new Date().toISOString(),
      sha: process.env.GITHUB_SHA ?? null,
      ref: process.env.GITHUB_REF ?? null,
      bundle_mb: bundleMb,
      failed,
    }) + '\n';
  appendFileSync(METRICS_FILE, line);
}

function main(): void {
  const bundleMb = checkBundleSize();
  checkSecrets();
  checkStrictTypes();
  appendMetrics(bundleMb);
  if (failed) process.exit(1);
}

main();

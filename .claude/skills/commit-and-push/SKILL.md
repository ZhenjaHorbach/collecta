---
name: commit-and-push
description: Use when the user asks to merge, commit, push, or open a PR on this repo. Layers Collecta-specific conventions (conventional commits, branch rules, pre-push checks) on top of Claude Code's default git workflow so commits and pushes match the project's CI and review rules.
---

# Commit and push

This skill supplements the built-in git workflow. Follow the harness's default commit / PR procedure **and** these project-specific rules.

## Branch check (do this first)

Before staging or committing, run `git branch --show-current` and confirm the branch matches the work:

- The branch name's slug should describe the change you're about to commit (e.g. don't commit Collections work to `feat/i18n-and-theming`).
- If the current branch was clearly cut for a different feature, **stop and ask the user** which branch to use, or suggest a new `<type>/<short-slug>` branched off `main` (or off the relevant feature branch when there's a real dependency).
- Never silently commit onto `main` — see Branch rules below.

**Why:** wrong-branch commits cost a `reset --hard` + branch shuffle to undo, and if pushed they pollute someone else's PR. Spending 5 seconds checking up front is cheaper than untangling later.

## Commit message

- Conventional commits only. Prefix: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
- Imperative subject under 72 chars. No trailing period.
- Body (when non-trivial): describe the _why_, not the _what_ — the diff already says what.
- Never commit `console.log`, commented-out code, `any`, or `@ts-ignore`. **Why:** these pass local tooling but fail CI's zero-warning lint and the code-style rule.

## Pre-commit

- Husky + lint-staged run on staged files automatically. Let hooks do their job — never bypass with `--no-verify`.
- If the hook fails: fix the underlying issue, re-stage, make a **new** commit. Do not `--amend` after hook failure.

## Staging

- Stage files by name, never `git add -A` or `git add .`. **Why:** prevents accidentally committing `.env`, credentials, or build artifacts.
- Never commit `.env`, `.env.local`, or anything under `supabase/.temp/`. Flag to the user if they ask.

## Branch rules

- `main` is protected. Never commit or push directly to `main`; require a feature branch + PR.
- Branch name: `<type>/<short-slug>` (e.g. `feat/language-switcher`, `fix/tabbar-colors`).
- Before pushing a new branch, confirm with the user — push is a remote-visible action.

## Pre-push checks

Mirror exactly what CI (`.github/workflows/ci.yml`) runs, in this order, and report each result:

1. `npm run format:check`
2. `npx eslint . --max-warnings 0`
3. `npx tsc --noEmit`
4. `npm test -- --passWithNoTests` (skip only if user explicitly says to)

**Why all four must match CI:** `lint-staged` in `.husky/pre-commit` auto-fixes Prettier on staged `.ts/.tsx/.js/.json/.md`, which masks formatting drift in files you didn't touch (post-merge state, hand-edited YAML/SQL/Swift, files committed with `--no-verify` elsewhere). `format:check` runs on the whole tree and catches those — skipping it locally guarantees CI red.

If a check fails, stop and surface it — do not push. Recovery:

- `format:check` fails → `npm run format` → re-stage the modified files → **new** commit (not `--amend`)
- `eslint` fails → fix the warning/error → re-stage → new commit
- `tsc` fails → fix the type error → re-stage → new commit
- `test` fails → fix the test or the code → re-stage → new commit

## Push

- `git push -u origin <branch>` for a new branch; `git push` afterwards.
- Never `git push --force` or `--force-with-lease` to `main`. To any other branch, only when the user asks.

## PR

- Create via `gh pr create` per the harness default. Title: conventional-commit style, same rules as commit subject.
- Body follows `.claude/skills/pr-description` if present; otherwise the harness default (`## Summary` + `## Test plan`).
- Base branch is `main` unless the user says otherwise.
- If CI secrets are required (per `.claude/rules/ci.md`) and the branch touches `supabase/migrations/**` or `supabase/functions/**`, note in the PR body that Supabase deploy will run on merge.

## Non-goals

- Do not run `git config` changes.
- Do not open PRs for branches that haven't been pushed yet — push first, then PR.
- Do not auto-approve or auto-merge PRs.

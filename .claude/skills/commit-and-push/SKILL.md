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

Run before `git push` and report results:

1. `npx tsc --noEmit`
2. `npx expo lint`
3. `npm test -- --passWithNoTests` (skip only if user explicitly says to)

If any fail, stop and surface the failure — do not push.

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

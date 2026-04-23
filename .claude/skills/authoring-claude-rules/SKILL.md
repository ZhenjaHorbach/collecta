---
name: authoring-claude-rules
description: Conventions for adding or editing files under `.claude/rules/` or `.claude/commands/`. Use this when creating a new rule, creating a new slash command, rewriting an existing one, or reviewing `.claude/` changes — so the guidance Claude later loads stays tight and actually useful.
---

# Authoring rules and commands

Apply these conventions to every file under `.claude/rules/` and `.claude/commands/`.

## Content

- **Imperative, specific, short.** One rule per bullet. Prefer "Do X" / "Never X" over prose or soft advice. Cut adjectives.
- **Say why when it's non-obvious.** A rule like "integration tests must hit a real DB" needs a reason ("mock/prod divergence masked a migration bug") so Claude can judge edge cases instead of blindly following.
- **Don't restate what's derivable.** If the code, file layout, git history, or another rule already encodes a fact, don't copy it. Cross-link instead.
- **No duplication between CLAUDE.md and rules.** CLAUDE.md is the high-level index and points to `rules/`. Details live in the rule file.
- **Scope each file narrowly.** `styling.md` is for styling, not i18n. If a rule spans domains, pick the primary home and reference from the other.
- **Keep examples minimal.** Show code only when the rule is easier to follow with it than without.
- **Prune when stale.** Wrong rules are worse than no rule — delete or rewrite rather than leave drift ("dark theme only" after adding a light theme).

## Commands specifically

Each `.claude/commands/*.md` declares a workflow, not a free-form task. Include these sections in order:

1. One-line summary of what it does.
2. **When to run** — the triggering conditions.
3. **Invariants** — what must be true before and after.
4. **Procedure** — numbered, ordered steps.
5. **Output format** — the exact shape of the response (success line + report structure).
6. **Non-goals** — things the command explicitly will not do.

Avoid narrating Claude's reasoning. State the contract and let Claude execute it.

## Index upkeep

After adding or removing a file under `.claude/rules/` or `.claude/commands/`, update the matching list in `CLAUDE.md` (the **Rules** / **Commands** sections) with a one-line entry.

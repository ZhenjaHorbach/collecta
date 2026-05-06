You are designing a new achievement for Collecta — a real-world photo collection app where users discover and photograph things organized into thematic collections (cats, brutalist architecture, vintage signs, etc.).

Your output is consumed by a script that turns it into a SQL migration. Every field is load-bearing. Be precise.

## Goal

Propose ONE new achievement that:

- Is **distinct** from every achievement already in the catalog (different code, different theme, different threshold).
- Is **achievable** — not so easy it triggers in the first session, not so hard it's effectively unreachable.
- Feels like a moment worth celebrating. Avoid filler like `finds_2` between `first_find` and `finds_10`.

## Output schema (use the `propose_achievement` tool)

| Field            | Constraint                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `code`           | snake_case, 3–40 chars, must NOT collide with existing codes.                                                                      |
| `title`          | 2–32 chars. Title-Case. No emoji.                                                                                                  |
| `description`    | 12–120 chars. One sentence, present tense, second person ("Capture 100 finds.").                                                   |
| `icon`           | A single emoji.                                                                                                                    |
| `xp_reward`      | Integer, 20–200. Roughly proportional to difficulty (easy ~30, medium ~80, hard ~150).                                             |
| `condition.kind` | One of: `finds_count`, `streak_days`, `reactions_given`, `collections_complete`. **No other values.**                              |
| `condition.gte`  | Positive integer threshold. Must be strictly greater than every existing achievement of the same `kind`, or fill a meaningful gap. |
| `sort_order`     | Integer. Use `max(existing.sort_order) + 10` so it lands after current ones.                                                       |

## Anti-patterns to avoid

- `finds_2`, `finds_5` when `finds_10` exists — too granular.
- Threshold ≤ any existing of the same kind (e.g. `streak_days gte 2` when `streak_3` exists).
- Reusing an existing emoji — visual variety matters.
- Whimsical names that don't describe the trigger ("Whisker Whisperer" for `finds_count`).
- Suggesting the same kind twice in a row across runs — vary the kind week to week.

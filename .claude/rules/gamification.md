# Gamification

## Source of truth

- **Schema** — `supabase/migrations/008_gamification.sql` (catalog + seeds + columns on `users` and `user_achievements`)
- **Math** — `supabase/functions/_shared/leveling.ts` (server) and `src/utils/streak.utils.ts` (client). Same formulas, duplicated intentionally — Deno code can't be imported into RN. When you change one, change the other.
- **Agent loop** — `supabase/functions/award-xp/index.ts`. Every gamification event flows through this single edge function.
- **Client bridge** — `src/services/gamification.service.ts` (`awardXp(userId, event)`), invoked fire-and-forget from places like `finds.service.ts` after the user's primary action commits.

## XP per event

Defined once in `supabase/functions/_shared/leveling.ts → XP_PER_EVENT` and rendered into the agent's system prompt so the model can't invent its own values.

| Event                 | XP  | Advances streak? |
| --------------------- | --- | ---------------- |
| `find`                | +10 | yes              |
| `reaction`            | +5  | no               |
| `collection_complete` | +25 | no               |

## Level formula

```
level = floor(sqrt(xp / 50)) + 1
xp_for(L) = 50 * (L - 1)^2
```

L2 at 50 XP, L5 at 800 XP, L13 at ~7200 XP. Calibrated for "find +10 / reaction +5" pacing without a separate balance table. **Do not** add per-level overrides — if balance changes, change the formula in both files.

## Streak

Advanced lazily inside `award-xp` on every `find` event:

```
diff = today_utc - users.last_find_date
diff == 0 → no change (same-day find)
diff == 1 → streak_days += 1
diff >  1 → streak_days = 1   (broken; today re-seeds)
last_find_date = today_utc
```

No cron job. A user who skipped 3 days still has the OLD `streak_days` in the DB until their next find. The UI corrects for this cosmetically via `getDisplayStreak(streakDays, lastFindDate)` — if last find is older than yesterday, render 0. **Never write the cosmetic 0 back to the DB**; the next find triggers the real reset.

## Achievement catalog

7 base achievements seeded in migration 008. Conditions are JSONB, evaluated by `check_achievements()` in `award-xp`. To add an achievement: bump migration number, insert with `on conflict (code) do update`, add a matching `condition.kind` branch in `matches()`. Never hardcode achievement logic in the client.

| Code                        | Icon | Trigger                  | XP  |
| --------------------------- | ---- | ------------------------ | --- |
| `first_find`                | 📸   | finds_count ≥ 1          | 20  |
| `finds_10`                  | 🎒   | finds_count ≥ 10         | 50  |
| `finds_50`                  | 🏛️   | finds_count ≥ 50         | 150 |
| `streak_3`                  | 🔥   | streak_days ≥ 3          | 30  |
| `streak_7`                  | 🔥   | streak_days ≥ 7          | 80  |
| `first_collection_complete` | 🏆   | collections_complete ≥ 1 | 100 |
| `reactions_given_25`        | 💬   | reactions_given ≥ 25     | 40  |

A "completed collection" = the user has at least one find for every `collection_items` row in a collection they joined (`user_collections`).

## Agent loop (CCAF Domain 1)

`award-xp` runs an Anthropic tool-use loop. The model owns the order of:

1. `get_user_stats(user_id)` — read XP, level, streak, finds_count, reactions_given, collections_complete
2. `update_user_xp(user_id, xp_delta, is_find_event)` — applies delta, recomputes level, advances streak when `is_find_event`
3. `check_achievements(user_id, stats)` — returns codes the user newly qualifies for
4. `unlock_achievement(user_id, code)` — idempotent insert into `user_achievements`, awards bonus XP

Loop terminates on `stop_reason !== 'tool_use'`. Safety cap `MAX_LOOP_STEPS = 8`. Every step prints `[award-xp][step N] tool=... input=... output=...` — view the trace via `supabase functions logs award-xp --follow`.

## AI usage tracking — mini variant

Aggregated token counts from the entire loop are written to **each** new `user_achievements` row (`ai_model`, `ai_input_tokens`, `ai_output_tokens`, `ai_cache_read_tokens`, `ai_cache_creation_tokens`). When no achievement was unlocked, usage is **not persisted** — that's the trade-off of the mini variant per CLAUDE.md.

**When to refactor to `ai_calls`:** as soon as a third Anthropic call site lands. At that point extract `extractUsage(message)` into `supabase/functions/_shared/anthropic-usage.ts` and create the `ai_calls(id, kind, model, *_tokens, metadata)` table.

## Where to debug

- **Agent trace** — `supabase functions logs award-xp --follow`
- **Per-unlock token cost** — `select * from user_achievements where user_id = ... order by unlocked_at desc;` then `estimateCostUsd(ai_model, …)` from `src/utils/cost-tracker.ts`
- **Stuck streak** — check `users.last_find_date` vs today; cosmetic logic in `src/utils/streak.utils.ts`
- **Missing toast** — confirm `<AchievementToastHost/>` is mounted in `src/app/_layout.tsx`; check that `awardXp(...)` was called (look for `[gamification]` warnings)

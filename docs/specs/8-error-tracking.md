# 8. Error tracking — proposal (no code)

## Today

- **App:** failures go to `console.warn` / `console.error` with a `[module]`
  prefix (`.claude/rules/code-style.md`) — 44 call-site lines in `src/`.
  `ErrorBoundary.componentDidCatch` only logs
  (`src/components/ErrorBoundary/ErrorBoundary.tsx:21-22`). In a release
  build these logs go nowhere we can read.
- **Edge functions:** `console.*` lines, visible only via
  the Dashboard (Edge Functions → function → Logs; the CLI has no logs command), retained per Supabase plan.
  No alerting. AI failures (`vision_failed`, `agent_failed`,
  `subagent_failed`, timeouts from item 2, `loop_budget_exceeded`) are only
  discoverable by reading logs.
- **Cost side** is covered (`ai_calls`), **failure side** isn't: a failed
  Anthropic call isn't logged anywhere structured.
- No crash/error SDK in `package.json` (only a stale `sentry-expo` entry in
  Jest's `transformIgnorePatterns`).
- `docs/privacy-policy.md:30` says **"We do not collect crash reports
  automatically."** Any option below requires changing that line (and the
  §3 recipients table) before release.

## Options

| Option                       | App (Expo / RN)                                                                     | Edge (Deno)                                                                       | Notes                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Sentry**                   | `@sentry/react-native` + Expo config plugin; source maps via EAS Build/Update hooks | `@sentry/deno` (`npm:` specifier via `deno.json`) — Supabase documents this setup | One tool for both sides; EU data region available; free tier exists.                |
| Bugsnag / Datadog RUM        | Mature RN SDKs                                                                      | No first-class Deno SDK — HTTP API or OpenTelemetry                               | Two integrations to maintain; Datadog is priced for larger teams.                   |
| PostHog error tracking       | RN SDK                                                                              | HTTP capture                                                                      | Pulls in product analytics too; privacy policy says no third-party analytics today. |
| Status quo + structured logs | Ship nothing; add a `[error]` JSON line convention                                  | Same, plus a Supabase log drain                                                   | Free, but no alerting, grouping or app-side visibility in release builds.           |

**Recommendation: Sentry**, one project per side (`collecta-app`,
`collecta-edge`), EU region.

## Cost (verify against current pricing before deciding)

- Sentry's free plan has historically covered 1 user and a few thousand
  errors per month; the paid team plan is a flat monthly fee with higher
  quotas. At current scale (pre-launch, Play Internal only) the free tier
  should be enough; set a hard quota + spike protection so a crash loop
  can't run a bill up.
- Engineering cost: ~0.5 day app, ~0.5 day edge, ~0.5 day CI source maps.
- Bundle size: the RN SDK adds native code → needs a **full native
  rebuild**, not OTA (`CLAUDE.md` → Over-the-air updates).

## Privacy rules for AI errors (must hold in any option)

- Never send photo URLs, user prompts (generate-collection), model output
  text or `ANTHROPIC_*` / Supabase keys. Use `beforeSend` to drop
  request bodies and scrub URLs on `finds-photos` / `collection-item-images`.
- User identity: Supabase user UUID only — no email, no display name.
- Tags instead of payloads: `ai.kind` (`validate-find:verify`, …),
  `ai.model`, `ai.error` (`timeout`, `rate_limited`, `schema_check`,
  `loop_budget_exceeded`), `ai.overridden` for the matches_claim safety net.

## Minimal rollout plan

1. **Policy first:** update `docs/privacy-policy.md` (§1 "What we do not
   collect", §3 recipients) and get legal review.
2. **Edge (no app release needed):** add `@sentry/deno` to `deno.json`,
   a tiny `_shared/error-reporting.ts` wrapper (`captureAiError(kind, err,
tags)`), call it in the existing `catch` blocks of `validate-find`,
   `award-xp`, `generate-collection`. DSN as a Supabase function secret.
   `deno check`, deploy one function to staging, trigger a forced timeout,
   confirm the event and the scrubbing.
3. **App:** `@sentry/react-native` + config plugin in `app.json`, init in
   `src/app/_layout.tsx`, report from `ErrorBoundary.componentDidCatch`.
   Keep `console.*` (dev signal). DSN via `EXPO_PUBLIC_SENTRY_DSN` (it's a
   public key by design) + `SENTRY_AUTH_TOKEN` as an EAS/GitHub secret for
   source-map upload only.
4. **Settings:** add a "Send crash reports" toggle to `SettingsScreen` per
   `.claude/rules/settings.md` (default decided with the policy text).
5. **Alerts:** one rule per side — new issue, and `ai.error` rate > N/hour.
6. **Docs:** add the SDK to `CLAUDE.md` stack list and `.claude/rules/ci.md`
   secrets.

## Out of scope

Any code or dependency change in this item.

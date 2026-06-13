# ENGINE — AI-Infrastructure Research Workstation

Personal investing **research** tool: 12 AI-infra sectors with lifecycle stages, daily
price/news ingestion, tripwire alert rules, a provider-agnostic LLM analyst, catalyst
calendar, ntfy phone push, and a cron scheduler.

**Hard prohibition: no broker APIs, no order placement, no trade execution code —
anywhere, ever.** This tool produces research, not investment advice.

## Stack

Next.js 16 (app router, server components) · React 19 · Tailwind 4 (CSS custom-property
theme in `app/globals.css`) · Prisma 6 + SQLite (WAL) · recharts · yahoo-finance2 ·
zod · vitest. LLM and ntfy calls use plain `fetch` — no SDKs.

## Commands

- `./start.sh` — interactive setup & service runner (recommended)
- `npm run dev` / `build` / `start` — web app
- `npm run db:setup` — generate client, apply migrations (`scripts/apply-migration.ts`), seed
- `npm run job <name>` — run one job now (prices|news|earnings|rules|nightly|monthly|morning|backup); flags: `--dry-run` (rules), `--backfill=N` (prices)
- `npm run scheduler` — long-running cron process; `npm run scheduler:test` runs every job once
- `npm run test` — vitest (pure logic only, no network/DB)
- `npm run smoke` — end-to-end sanity checks

## Layout

- `config/` — typed config: `sectors.ts` (12-sector taxonomy + seed tickers), `tripwires.ts` (alert rules), `providers.ts` (LLM profiles), `settings.ts`
- `lib/jobs/` — ingestion jobs behind one registry (`registry.ts`) + `runner.ts` wrapper (JobRun row, ntfy on failure, never throws)
- `lib/rules/` — pure tripwire evaluators over an injectable `RuleContext`
- `lib/analyst/` — snapshot builder, two protocol adapters (anthropic, openai_compat), prompts, zod schemas, runner
- `app/` — workstation UI; server components by default, mutations via `app/actions.ts`

## Conventions

- Market-data dates are `YYYY-MM-DD` strings (`Price.d`, `Catalyst.d`, `ManualSeries.d`); audit timestamps are DateTime.
- Jobs must never crash on network errors: catch per item, count failures into the JobRun detail string.
- `Brief.inputJson` stores the exact request payload sent to the provider — the audit trail is a feature.
- `Sector.stage` is only ever changed by a human action (seed on create, UI apply); the analyst writes proposals to `StageHistory`.
- Derived metrics (pct change, drawdown) are computed from stored closes, never persisted.

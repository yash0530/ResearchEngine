# ENGINE — AI-Infrastructure Research Workstation

Personal investing **research** tool: 12 AI-infra sectors with lifecycle stages, an overnight
ETL pipeline (price / news / earnings ingestion), tripwire risk signals, a **deterministic
synthesis engine** that builds a morning **Digest**, an optional provider-agnostic LLM layer
that narrates it, a catalyst calendar, and a cron scheduler. Dashboard-first: you read it once
each morning — there is no phone push.

**Hard prohibition: no broker APIs, no order placement, no trade execution code —
anywhere, ever.** This tool produces research, not investment advice.

## Stack

Next.js 16 (app router, server components) · React 19 · Tailwind 4 (CSS custom-property
theme in `app/globals.css`) · Prisma 6 + SQLite (WAL) · recharts · yahoo-finance2 ·
zod · vitest. LLM calls use plain `fetch` — no SDKs.

## Commands

- `./start.sh` — interactive setup & service runner (recommended)
- `npm run dev` / `build` / `start` — web app
- `npm run db:setup` — generate client, apply migrations (`scripts/apply-migration.ts`), seed
- `npm run job <name>` — run one job now (overnight|prices|news|earnings|rules|nightly|monthly|morning|backup); flags: `--dry-run` (rules), `--backfill=N` (prices)
- `npm run scheduler` — long-running cron process; `npm run scheduler:test` runs the overnight pipeline + monthly once
- `npm run test` — vitest (pure logic only, no network/DB)
- `npm run smoke` — end-to-end sanity checks

## Layout

- `config/` — typed config: `sectors.ts` (12-sector taxonomy + seed tickers), `tripwires.ts` (signal rules), `providers.ts` (LLM profiles), `settings.ts`
- `lib/jobs/` — ingestion jobs behind one registry (`registry.ts`) + `runner.ts` wrapper (JobRun row, never throws) + `overnight.ts` (the ordered ETL chain)
- `lib/rules/` — pure tripwire evaluators over an injectable `RuleContext` (signals only — no paging)
- `lib/research/` — deterministic `synthesize.ts` (stored facts → ranked insights, each with provenance) + optional `llm.ts` (narrates the digest over those facts)
- `lib/analyst/` — snapshot builder, two protocol adapters (anthropic, openai_compat), prompts, zod schemas, runner
- `app/` — workstation UI; server components by default, mutations via `app/actions.ts`. Home (`/`) is the morning Digest.

## Conventions

- Market-data dates are `YYYY-MM-DD` strings (`Price.d`, `Catalyst.d`, `ManualSeries.d`); audit timestamps are DateTime.
- Jobs must never crash on network errors: catch per item, count failures into the JobRun detail string. A failed step never aborts the `overnight` chain.
- **Accuracy first:** the morning `Digest` is DETERMINISTIC — every insight carries an `evidence` string tracing to a computed number or a dated source. The LLM only *narrates* already-true facts (`Digest.llmMd`); it never fabricates, and the digest stands alone without it. Implausible values (e.g. split/bad-tick drawdowns ≤ −70%) are flagged as data quality, never presented as signal.
- `Brief.inputJson` stores the exact request payload sent to the provider — the audit trail is a feature.
- `Sector.stage` is only ever changed by a human action (seed on create, UI apply); the analyst writes proposals to `StageHistory`.
- Derived metrics (pct change, drawdown) are computed from stored closes, never persisted.

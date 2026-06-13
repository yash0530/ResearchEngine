# ENGINE

A personal AI-infrastructure investing **research** workstation. Twelve sectors mapped
to a lifecycle (early → inflecting → popping → crowded → reset), daily price and news
ingestion, tripwire alerts to your phone, a provider-agnostic LLM analyst that writes a
nightly brief and proposes monthly stage re-rates, a catalyst calendar, and a journal.

> **This tool produces research, not investment advice. It places no orders and never will.**

It has no broker integration and no order-placement code anywhere. Everything it does is
read, compute, summarize, and notify.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Prisma 6 + SQLite (WAL) · recharts · yahoo-finance2 ·
zod · vitest. The LLM and ntfy calls use plain `fetch` — no SDKs. The only ingestion deps
beyond the web stack are `rss-parser` and `node-cron`.

## Quick start

```bash
npm install
cp .env.example .env            # then edit (see Configuration)
npm run db:setup                # generate client, apply migration, seed 12 sectors + ~130 tickers
npm run job -- prices --backfill=400   # ~1 year of daily closes (needed for charts & drawdowns)
npm run job -- news             # per-sector headlines
npm run job -- earnings         # upcoming earnings → calendar (slow, ~1/sec)
npm run dev                     # http://localhost:3000
```

Open the board: 12 sector cards distributed across the five stage columns, each with a
30-day sparkline. Then keep it current with the scheduler (below).

## Configuration

`.env` (gitignored) holds secrets and machine-local switches:

| Key | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path; default `file:./dev.db?connection_limit=1` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY` | only the providers you use |
| `ANALYST_ENABLED` | `false` until you add a key; flip to `true` to run briefs/re-rates |
| `NTFY_ENABLED` / `NTFY_URL` / `NTFY_TOPIC` | phone push via [ntfy](https://ntfy.sh); pick an unguessable topic and subscribe in the app |
| `ENGINE_TZ` | optional IANA tz for the scheduler (empty = system local) |

Everything else is typed code in `config/`:

- **`config/sectors.ts`** — the 12-sector taxonomy, ticker membership, seed stages, per-sector news queries, benchmarks, manual-series and static-catalyst seeds. This is the universe; edit it and re-run `npm run seed`.
- **`config/tripwires.ts`** — the alert rules.
- **`config/providers.ts`** — LLM provider profiles.
- **`config/settings.ts`** — schedule times, retention windows, analyst provider mapping.

## The analyst is provider-agnostic

Two protocol adapters cover the whole ecosystem:

- **`anthropic`** → `POST {baseUrl}/v1/messages`
- **`openai_compat`** → `POST {baseUrl}/chat/completions` (OpenAI, OpenRouter, Groq, Together, Mistral, DeepSeek, xAI, Gemini's compatible endpoint, and local servers like Ollama / LM Studio)

To use any provider: add or edit a profile in `config/providers.ts`, point
`config/settings.ts` `analyst.nightly` / `.monthly` / `.event` at it, and put the key in
`.env` under the name in `apiKeyEnv` (or `null` for keyless local servers). **No code
changes.** Defaults ship as Anthropic `claude-haiku-4-5` (nightly) and `claude-sonnet-4-6`
(monthly re-rate).

| You want | protocol | baseUrl | key env | notes |
|---|---|---|---|---|
| Anthropic | `anthropic` | (default) | `ANTHROPIC_API_KEY` | |
| OpenAI | `openai_compat` | `https://api.openai.com/v1` | `OPENAI_API_KEY` | uses `max_completion_tokens` |
| OpenRouter | `openai_compat` | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | model id like `vendor/model` |
| Gemini (compat) | `openai_compat` | `https://generativelanguage.googleapis.com/v1beta/openai` | `GEMINI_API_KEY` | bare model id, no `models/` prefix |
| Ollama (local, free) | `openai_compat` | `http://localhost:11434/v1` | *(none)* | `jsonMode` on; jsonsafe absorbs messy JSON |

Model ids and base URLs drift — verify against each provider's docs.

## Jobs

One registry (`lib/jobs/registry.ts`) backs the scheduler, the CLI, the `/api/jobs/*`
route, and the Ops page — "run now" anywhere is the same code path. Every job is wrapped:
it writes a `JobRun` row, pushes an ntfy warn on failure, and never throws.

```bash
npm run job -- <prices|news|earnings|rules|nightly|monthly|morning|backup>
npm run job -- prices --backfill=400      # widen the heal window for initial history
npm run job -- rules --dry-run            # evaluate tripwires without firing/recording
npm run job -- nightly --provider=ollama_local   # one-off provider override
npm run job -- event "MSFT guided FY27 capex down 15%"   # event-mode analysis
```

## Scheduler

```bash
npm run scheduler         # long-running daemon (local-time cron)
npm run scheduler:test    # run every job once, in sequence, then exit
```

Default schedule: prices 22:30 · news 23:00 · rules 23:30 · nightly brief 23:45 · earnings
Sat 10:00 · morning push 07:30 · monthly re-rate after the nightly slot on the last day of
the month. A daily SQLite backup (`VACUUM INTO data/backups/`) runs inside the prices job,
keeping the newest 14.

**Keep it alive on macOS (launchd):**

```bash
# edit the absolute paths inside the plist first
cp scripts/com.engine.scheduler.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.engine.scheduler.plist
# logs → data/scheduler.log ; stop with:
launchctl bootout gui/$(id -u)/com.engine.scheduler
```

A sleeping Mac won't fire overnight cron ticks; the 5-day price healing window plus the
Ops page "Run now" buttons are the recovery path. The sidebar shows a heartbeat dot driven
by the most recent `JobRun`.

## Pages

**Board** (the hero: sectors placed in their stage columns) · **Sector** (members table,
news, catalysts, stage re-rate) · **Tickers** / **Ticker** (price chart, metrics, position,
journal) · **Alerts** (tripwire fires, acknowledge) · **Briefs** (analyst archive with full
audit trail) · **Calendar** (catalyst CRUD) · **News** · **Journal** (positions + thesis /
invalidation entries) · **Series** (the hand-entered fundamentals the tripwires read) ·
**Re-rate** (apply analyst stage proposals — the human-only action) · **Ops** (run jobs,
event mode, ntfy test, job log, backups).

## Workflow notes

- **Manual series** drive the memory thesis. Enter DDR5/NAND contract-price MoM % and the
  hyperscaler `capex_flag` (−1 down / 0 / +1 up) on the Series page; `ddr5_two_down` +
  `memory_exit` read them.
- **Stage changes** are only ever made by you. The seed sets initial stages; the analyst
  writes *proposals* to stage history; applying them on Re-rate is the human action.
- **Briefs store the exact payload** sent to the provider. The audit trail is the point.

## Tests

```bash
npm run test     # vitest — pure logic (rules engine, metrics, jsonsafe, snapshot, config)
npm run smoke    # end-to-end sanity against the live DB
```

## Layout

```
app/            workstation UI (server components; mutations in app/actions.ts) + api/
components/     board, charts, and per-page client islands
config/         sectors · tripwires · providers · settings
lib/            metrics · yahoo · notify · dates
  jobs/         registry + runner + one file per job
  rules/        pure tripwire evaluators + orchestration
  analyst/      snapshot · providers · prompts · schemas · runner
prisma/         schema + hand-written migration + seed
scripts/        scheduler · pull (CLI) · smoke · apply-migration · launchd plist
tests/          vitest suites
```

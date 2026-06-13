# ENGINE — Transformation Ledger

Autonomous transformation into a **dashboard-first, deep-research investment workstation**.
Branch: `engine-research-transform` (off clean `main`). Each iteration: plan → act → verify.

> **Invariant preserved across every iteration:** research only — no broker APIs, no order
> placement, no execution code. Every synthesized claim traces to a computed number or a
> dated source. "Research, not advice" stays in the product surface.

---

## Iteration 0 — Deep dive & baseline (DONE)

**Plan/self-prompt:** Before changing anything, map the system, find the real baseline, and
resolve the central tension: the user wants a "deep research synthesis" tool for allocating
$100K, but (a) the LLM analyst was disabled with no key, and (b) LLM prose over noisy
headlines is a *poor* foundation for real-money decisions. Decide an architecture that is
accurate-by-construction.

**Findings:**
- Mature codebase (M5–M9 + 6 WIP commits already landed). Baseline is GREEN: `tsc` clean,
  92 vitest tests pass. The git snapshot in the task prompt was stale.
- Architecture: 12 AI-infra sectors × lifecycle stages; jobs (prices/news/earnings/rules/
  nightly/monthly/morning/backup) behind one registry+runner; pure tripwire rules; provider-
  agnostic analyst (anthropic + openai_compat); Prisma/SQLite; Next 16 server components.
- Real-time alerting was already opt-in: `NTFY_ENABLED=false`. Severity routing existed
  (critical→page, warn→morning push, info→UI). News = Google News RSS *headlines only*.
- `.env`: analyst disabled, all keys empty → analyst could not run.

**Mid-flight input from user:** provided a live Gemini key; authorized `gemini-3.1-flash-lite`
now, `gemini-3.5-flash` later. Verified empirically: key lists models and returns clean JSON
via the OpenAI-compat `/chat/completions` path. Configured `gemini_compat` + pointed all
analyst roles at it. Key stored only in gitignored `.env` (never committed; rotate later).

**Locked decisions:**
1. **Deterministic synthesis is the backbone** (cannot hallucinate); LLM is optional
   enrichment layered on already-true facts. This is the accuracy-first answer to "deep
   research for $100K."
2. Strip real-time push (ntfy) entirely; keep tripwire *signal* logic; redirect to dashboard.
3. Morning job becomes a persisted **Digest** the dashboard renders as its hero.
4. One dependency-ordered **overnight pipeline** so the dashboard is coherent by morning.
5. Minimalist UI: home = single morning decision surface; consolidate nav.

**Verification:** `tsc --noEmit` exit 0; `vitest` 92/92; Gemini compat call returns
`{"ok":true,"n":3}` with usage. Branch created; `main` untouched as fallback.

---
## Iteration 1 — Excise real-time alerting (DONE)

**Plan/self-prompt:** Remove the push *delivery* without losing the tripwire *signal*. The
rules are valuable risk intelligence; only the phone-pager semantics conflict with a
check-once-a-morning dashboard. Severity must survive (to rank fires in the digest), only
routing dies.

**Actions:**
- Deleted `lib/notify.ts`.
- `lib/jobs/runner.ts`: failures now record JobRun only (no push); rewritten + recommented.
- `lib/rules/engine.ts`: removed notify import, the critical-push routing block, and the
  `pushFailed` field. `RuleEvent` rows (with severity) still written — pure signal.
- `lib/jobs/morning.ts`: removed push (full Digest rewrite deferred to Iteration 6).
- `app/actions.ts`: removed `testNtfyAction`. `components/ops-client.tsx`: removed the
  Notifications panel + test button; relabelled "Morning push"→"Morning digest"; added an
  "Overnight pipeline" button (job registered in Iteration 7).
- `config/settings.ts`: removed the `ntfy` block. `config/tripwires.ts` + `scripts/
  scheduler.ts`: comments updated. `.env` + `.env.example`: removed NTFY_* vars.

**Verification:** `tsc --noEmit` exit 0; `grep ntfy/sendNtfy` over code = none; `vitest`
92/92. (README/CLAUDE.md ntfy mentions deferred to the docs iteration.)

## Iteration 2 — Digest model + migration (DONE)

**Plan/self-prompt:** The morning synthesis needs a home that does NOT presuppose an LLM.
Reusing `Brief` (provider/model/inputJson required) would force LLM-shaped rows. A dedicated
`Digest` table lets the deterministic synthesis stand alone, with optional LLM prose as
nullable columns. Fold in the `NewsItem.snippet` column now (needed Iteration 4) to avoid a
second migration.

**Actions:**
- `prisma/schema.prisma`: added `Digest { id, d, createdAt, dataJson, llmMd?, llmProvider?,
  llmModel? }` (+ createdAt index) and `NewsItem.snippet String?`.
- `prisma/migrations/20260613010000_add_digest_and_snippet/migration.sql`: hand-written SQL
  matching the repo convention (ALTER NewsItem, CREATE Digest, CREATE INDEX).
- Regenerated the Prisma client; applied via `scripts/apply-migration.ts`.

**Verification:** migration recorded + applied; `sqlite3 .schema Digest` shows the table;
`PRAGMA table_info(NewsItem)` shows `snippet`; `tsc --noEmit` exit 0 with the new client.

## Iteration 3 — Deterministic synthesis engine (DONE)

**Plan/self-prompt:** Build the accuracy-first core: stored facts → ranked INSIGHTS, each
with an `evidence` provenance string. Eight families: fired tripwires, manual-series signals
(capex_flag/ddr5), per-sector drawdown risk, credit proxy (HYG/IEF), sector-vs-hyperscaler
divergence (the key Driver-1 tell), stage-framed momentum, near-term catalysts, and data
health. Pure `synthesize()` + Prisma `buildDigestData()`, mirroring snapshot.ts.

**Actions:** wrote `lib/research/synthesize.ts` (types, thresholds in one `T` block, pure
synth + loader). Ran it against the live DB via `scratch/check-digest.ts`.

**Caught a real data-quality bug (this is why deterministic-first matters):** the engine
surfaced `KLAC -88% off 60d high` as a top risk. Inspection showed KLAC closes spike
~$213 → ~$2,139 for 3 days (Jun 5–9) then snap back — bad ticks, not a real move; the fake
high poisoned the drawdown. Added a `drawdownImplausible = -70` guard: such values are
diverted to a **data-quality warning** ("likely splits/bad ticks — refetch & verify"),
never presented as real risk. Did NOT mutate the user's price DB silently.

**Verification:** `tsc` exit 0. Live run: headline = "2 critical signals — MEMORY EXIT…",
14 ranked insights, KLAC no longer a false risk, divergence/credit/momentum all sane with
correct provenance. **Follow-up noted:** ingestion-level bad-tick despiking would fix the
root cause for charts too (candidate for a later pass).

## Iteration 4 — News snippet enrichment (DONE)

**Plan/self-prompt:** Headlines alone are thin. Capture the RSS description so both the
deterministic digest and the analyst snapshot have context. Stay on free sources (no
scraping/paid APIs) — proportionate and ToS-safe.

**Actions:** `lib/jobs/news.ts` — added `contentSnippet`/`content` to the parsed item type,
a `cleanSnippet()` (strip HTML, collapse whitespace, drop title-dupes, cap 400 chars), and
wrote `snippet` on create. **Verification:** `tsc` ok; ran the live news job — added 103
items; `sqlite3` confirms all 103 new rows carry snippets.

## Iteration 5 — Snapshot + prompt enrichment (DONE)

**Plan/self-prompt:** Give the LLM the same macro anchor the deterministic engine uses, so
its brief reads sectors RELATIVE to the capex that funds them. Additive schema changes
(tested contract) — bump headlines to 5/sector with snippets, add a `market` block and a
per-sector `vs_hyperscaler_30d`, and deepen the prompts to demand synthesis.

**Actions:** `schemas.ts` (+`market`, +`vs_hyperscaler_30d`, both nullable); `snapshot.ts`
(hyperscaler basket + HYG/IEF credit ratio + per-sector divergence + snippet-bearing
headlines); `prompts.ts` (NIGHTLY + MONTHLY_RERATE rewritten around divergence/capex/credit
with "synthesis not a data dump", every rationale must cite a number); `snapshot.test.ts`
(5-cap + snippet format, new divergence test).

**Verification:** `tsc` ok; `vitest` 93/93. Live nightly via Gemini flash-lite: brief #1,
4288/391 tok. The prose cites the 62.33pp/31.76pp divergences, −2.79% capex backdrop, credit
0.44, ties Memory-Exit to a "picks-and-shovels at risk" thesis, and flags items to verify at
source — synthesis with provenance, guardrails intact.

## Iteration 6 — Morning job → persisted Digest (DONE)

**Plan/self-prompt:** Morning job = build deterministic DigestData, optionally layer a SHORT
LLM editor's note over the (already-true) insights, persist one Digest. The LLM must never
block the digest. Use JSON-mode-safe output (the gemini profile forces json_object).

**Actions:** `lib/research/llm.ts` (`narrateDigest` — returns `{note_md}` via the provider
adapter; returns null on disabled/no-key/bad-output/throw); rewrote `lib/jobs/morning.ts`
to build → narrate → `prisma.digest.create`. **Verification:** ran the morning job — digest
#1, 14 insights/2 critical, narrated via gemini flash-lite. The note even flagged the KLAC
bad tick as a data caveat — the accuracy guard propagated all the way into the prose.

## Iteration 7 — Overnight pipeline (DONE)

**Plan/self-prompt:** Replace 6 independent crons with ONE ordered chain so the morning board
is coherent, not racing. A failed step must not abort the chain.

**Actions:** `lib/jobs/overnight.ts` (`runOvernight` — prices→news→earnings→rules→nightly→
morning, each wrapped in runJob, failures counted not fatal); registered `overnight` in the
registry; `config/settings.ts` schedule collapsed to `overnight` (03:00) + `monthly`;
rewrote `scripts/scheduler.ts` to schedule those two and `scheduler:test` to run them.
**Verification:** `tsc` ok; no dangling old-schedule-key refs; steps individually proven.

## Iteration 8 — Home = Morning digest (DONE)

**Plan/self-prompt:** Home becomes the one-screen morning decision surface: headline +
editor's note + capex backdrop as the hero, then the ranked signal list WITH visible
provenance, then the live stage board, then movers/catalysts. Degrade cleanly when no
digest / no LLM.

**Actions:** `loadLatestDigest()` in `lib/board.ts`; rewrote `app/page.tsx` (server
component) around the digest with an `InsightList` showing severity + evidence + sector/
symbol links. **Verification:** `tsc` ok; renders in the production build.

## Iteration 9 — Nav consolidation + Alerts→Signals (DONE)

**Plan/self-prompt:** Cut the flat 10-item nav into grouped sections (daily / Research /
Positions / System) and rename Alerts→Signals to match the no-push vocabulary.

**Actions:** `git mv app/alerts app/signals`; page retitled "Signals" with no-push copy;
3× `revalidatePath("/alerts")`→`/signals`; rebuilt `components/app-shell.tsx` with grouped
nav. (Internal `AlertsClient`/`ackAlertAction` names kept — low-value churn.) Cleared a stale
`.next/types` artifact that referenced the old route. **Verification:** `tsc` exit 0;
`npm run build` succeeds — all 16 routes incl. `/signals`, no `/alerts`.

## Iteration 10 — Tests, docs, verification (DONE)

**Plan/self-prompt:** Lock the accuracy-critical core under test, make the docs tell the
true (no-push, digest-first) story, and certify the whole thing builds.

**Actions:** `tests/synthesize.test.ts` (8 tests: severity ranking + headline, bad-tick
divert, divergence, credit scoping, capex signal, staleness, quiet-tape, insight cap keeping
criticals). Extended `scripts/smoke.ts` with digest checks (12 sectors, headline, provenance
on every insight) + provider-agnostic ping. Rewrote `CLAUDE.md` + `AGENTS.md`; updated
`README.md` (intro, stack, config table, providers default → Gemini flash-lite, jobs,
schedule, pages Alerts→Signals) and `start.sh` (dropped ntfy copy).

**Verification:** `vitest` 101/101; `npm run smoke` all green (snapshot 13.4kB, digest 14
insights with provenance); `npm run build` succeeds (16 routes, `/signals`, no `/alerts`);
repo-wide `ntfy` grep clean except this ledger; `.env` confirmed gitignored (key safe).

## Iteration 11 — Despike bad price ticks (DONE)

**Plan/self-prompt:** Fix the KLAC bad-tick at the ROOT so every computed metric (board,
sparklines, sector, snapshot, digest, chart) is clean — not just flagged in the digest.
Must survive multi-day spike *blocks* and never drop legitimate trends. Non-destructive
(don't mutate the price DB).

**Actions:** `despike()` in `lib/metrics.ts` — rolling-MEDIAN outlier filter (a close ≥2.5×
off its local-window median is a tick, not a move; median survives multi-day blocks). Applied
at the analytics loaders: `board.bulkCloses`, `snapshot.buildSnapshot`, `synthesize.
buildDigestData`, and the ticker chart. 5 unit tests in `metrics.test.ts`.

**Caught my own bug under test:** `window=5` let a 3-day spike block dominate a one-sided
edge window, pulling the median up so NORMAL values looked like low outliers (dropped
210/212/209). Widened the window to 10 (real series are 35–260 long → block is always a
minority). **Verification:** `tsc` ok; `vitest` 106/106; regenerated digest #2 is clean —
KLAC gone from BOTH the risk list and the suspect-data warning. The implausible-guard stays
as a safety net for anything despike can't catch.

## Iteration 12 — Synthesis on the Sector page (DONE)

**Plan/self-prompt:** Synthesis shouldn't live only on the home page. Surface each sector's
pulse where you drill in. Reuse the persisted digest (no recompute).

**Actions:** `app/sectors/[code]/page.tsx` — parallel-load `loadLatestDigest`, find the
`SectorPulse` + insights scoped to this code, render a "Morning pulse" panel (1d/7d/30d,
vs-hyperscaler pp, worst drawdown, leader/laggard, scoped insights with provenance).
**Verification:** `tsc` exit 0.

## Iteration 13 — Pre-stage gemini_strong (DONE)

**Plan/self-prompt:** The user flagged 3.5-flash quota coming. Pre-stage it so the upgrade is
one line, without breaking anything now (free tier may lack quota).

**Actions:** added the `gemini_strong` profile (`gemini-3.5-flash`) to `config/providers.ts`
— defined but unused; `config/settings.ts` keeps `monthly` on flash-lite today with a comment
pointing at the one-line switch. **Verification:** `tsc` exit 0; no behavior change now.

## Iteration 14 — Dead-code cleanup (DONE)

**Plan/self-prompt:** The home rewrite orphaned `loadBoardPage`'s `unacked`/`latestBrief`
(the digest replaced them). Confirm no other consumer, then trim — keep the codebase a
"definitive source of truth" with no vestigial queries.

**Actions:** verified `loadBoardPage` is used only by `app/page.tsx` (which dropped those
fields); removed the `ruleEvent`/`brief` queries, the `unacked`/`latestBrief` return fields,
and the now-unused `parseBriefMd` helper from `lib/board.ts`. **Verification:** `tsc` OK;
`vitest` 106/106; `npm run build` compiled; `npm run smoke` PASSED.

---

# SUMMARY

**Mission:** transform a phone-pager-style alerting app into a dashboard-first, accuracy-led
**research workstation** for allocating real capital — high signal-to-noise, fresh by morning.

**The pivotal architectural call:** with no LLM key initially (and LLM prose over noisy
headlines being a poor basis for $100K decisions), the synthesis backbone is **deterministic**
— stored facts → ranked insights, each carrying an `evidence` provenance string, nothing
invented. The LLM (now live on Gemini flash-lite) is an **optional enrichment** that narrates
facts already computed; the digest stands alone without it. Accuracy is structural, not hoped-for.

**What shipped (15 iterations):**
- Real-time push (ntfy) fully excised; tripwire **signal** logic preserved → dashboard.
- `Digest` model + the deterministic `synthesize.ts` engine (8 insight families, provenance).
- Bad-tick **despike** (rolling-median) — fixed a real KLAC data corruption at the root.
- News snippets + a richer, divergence-aware analyst snapshot & prompts.
- Morning job → persisted `Digest` (+ optional LLM editor's note); one ordered **overnight
  pipeline** keeps the board fresh by morning.
- Home → one-screen **Morning** digest; nav consolidated; Alerts → **Signals**; sector pulse.
- 106 tests, smoke, and a clean production build. Docs + memory updated.

**Guardrail held throughout:** research only — no broker/order/execution code; every claim
traces to a number or a dated source; "research, not advice" stays on the surface.

**Known follow-ups:** wire `gemini_strong` (3.5-flash) for the monthly re-rate once quota
lands (one line); consider despiking at ingestion too (currently cleaned in analytics only);
rotate the Gemini key that was shared in chat.

---

# POST-MERGE SESSION (autonomous, 2026-06-13 PM)

Continued on `main` after the merge, in the Opus-orchestrates / agy-implements workflow.

- **Pushed** to `origin/main` (work backed up; repo: github.com/yash0530/ResearchEngine).
- **Live data:** real 400-day backfill (**131/131 symbols, 36,025 rows**) replaced the synthetic
  set; ran the overnight pipeline so the digest reflects real data.
- **Position-aware "Your book" overlay** (`21b2419`): built by the agy runner, reviewed by
  Opus — review caught a despike-on-positions bug and fixed it before commit.
- **"By driver" rollup** (`5dabf0d`): Driver-1 confirmed at 8/12 sectors, +23pp vs hyperscalers.
- **Technicals-screener despike** (`8da6cd1`): RSI/MACD/Bollinger/SMA now use cleaned closes —
  the last read path that was still on raw data. Chose this over destructive write-time
  mutation (the real backfill already cleaned storage).

**agy outcome (honest):** worked for the first feature, then went non-functional — two
driver-rollup delegations (~35 min total) produced ZERO output (the wrapper kept spawning
background tasks and exiting with "I'll wait"). Rather than loop on a broken tool I
implemented those directly to the same gate bar (tsc + tests + build). **Recommend verifying
the `agy` CLI install/auth before relying on it again.**

**State:** `main` @ `8da6cd1`, pushed · 111 tests · build + smoke green · real data.

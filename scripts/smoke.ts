// End-to-end sanity checks. Read-mostly; safe to run any time. Exit code = failures.

import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { ALL_SEED_SYMBOLS, BENCHMARKS, MANUAL_SERIES, SECTOR_SEEDS } from "../config/sectors";
import { TRIPWIRES } from "../config/tripwires";
import { pctChange } from "../lib/metrics";
import { buildSnapshot } from "../lib/analyst/snapshot";
import { SnapshotSchema } from "../lib/analyst/schemas";
import { runAllRules } from "../lib/rules/engine";
import { buildDigestData } from "../lib/research/synthesize";
import { settings } from "../config/settings";

const prisma = new PrismaClient();
let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  // ── Schema / seed integrity ────────────────────────────────────────────────
  const sectorCount = await prisma.sector.count();
  check("12 sectors seeded", sectorCount === 12, `found ${sectorCount}`);

  const activeCount = await prisma.ticker.count({ where: { active: true } });
  check("≥130 active tickers", activeCount >= 130, `found ${activeCount}`);

  const benchCount = await prisma.ticker.count({ where: { class: "benchmark" } });
  check("benchmarks present", benchCount === BENCHMARKS.length, `found ${benchCount}/${BENCHMARKS.length}`);

  // ── Config cross-checks (also covered by vitest, but verify against the live DB) ──
  const universe = new Set([...ALL_SEED_SYMBOLS, ...BENCHMARKS.map((b) => b.symbol)]);
  let badRefs = 0;
  for (const rule of TRIPWIRES) {
    if (rule.type === "drawdown" && !universe.has(rule.symbol)) badRefs += 1;
    if (rule.type === "ratio_change" && (!universe.has(rule.a) || !universe.has(rule.b))) badRefs += 1;
    if (
      (rule.type === "consecutive_monthly" || rule.type === "flag_equals") &&
      !(MANUAL_SERIES as readonly string[]).includes(rule.series)
    ) {
      badRefs += 1;
    }
  }
  check("tripwires reference known symbols/series", badRefs === 0, `${badRefs} bad refs`);
  check("every sector has a news query", SECTOR_SEEDS.every((s) => s.newsQuery.length > 0));

  // ── Metrics don't throw ────────────────────────────────────────────────────
  try {
    const mu = await pctChange("MU", 1);
    check("pctChange(MU,1) returns number|null", mu === null || Number.isFinite(mu), `value=${mu}`);
  } catch (error) {
    check("pctChange(MU,1) does not throw", false, String(error));
  }

  // ── Snapshot shape + size ──────────────────────────────────────────────────
  try {
    const snapshot = await buildSnapshot();
    const parsed = SnapshotSchema.safeParse(snapshot);
    check("snapshot is schema-valid", parsed.success, parsed.success ? "" : parsed.error.message.slice(0, 120));
    check("snapshot has 12 sectors", snapshot.sectors.length === 12, `found ${snapshot.sectors.length}`);
    const size = JSON.stringify(snapshot).length;
    check("snapshot serializes under 24kB", size < 24_000, `${size} chars`);
  } catch (error) {
    check("buildSnapshot does not throw", false, String(error));
  }

  // ── Rules engine runs (dry) ────────────────────────────────────────────────
  try {
    const result = await runAllRules({ dryRun: true });
    check("rules dry-run completes", result.evaluated === TRIPWIRES.length, `evaluated ${result.evaluated}`);
  } catch (error) {
    check("rules dry-run does not throw", false, String(error));
  }

  // ── Digest synthesis (deterministic — the morning hero, needs no LLM) ───────
  try {
    const digest = await buildDigestData();
    check("digest builds with 12 sectors", digest.sectors.length === 12, `found ${digest.sectors.length}`);
    check("digest produces a headline", digest.headline.length > 0);
    check(
      "every insight carries evidence (provenance)",
      digest.insights.every((i) => i.evidence.length > 0),
      `${digest.insights.length} insights`,
    );
  } catch (error) {
    check("buildDigestData does not throw", false, String(error));
  }

  // ── Optional provider ping (only if the analyst is enabled) ─────────────────
  if (settings.analyst.enabled) {
    console.log(
      `· analyst enabled (${settings.analyst.nightly}) — run \`npm run job -- nightly\` or \`morning\` to verify live LLM calls.`,
    );
  }

  await prisma.$disconnect();
  console.log(failures ? `\nSMOKE FAILED — ${failures} check(s)` : "\nSMOKE PASSED");
  process.exit(failures ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Stage, TickerClass } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MANUAL_SERIES, STAGES } from "@/config/sectors";
import { sendNtfy } from "@/lib/notify";
import { runJob } from "@/lib/jobs/runner";
import { runAnalyst } from "@/lib/analyst/runner";

// ── Sectors / stages ─────────────────────────────────────────────────────────

const stageSchema = z.object({
  code: z.string().min(2).max(2),
  stage: z.enum(STAGES),
  rationale: z.string().trim().min(1).max(500),
});

/** Human stage override: updates the sector AND records who/why in StageHistory. */
export async function setSectorStageAction(input: {
  code: string;
  stage: string;
  rationale: string;
}) {
  const v = stageSchema.parse(input);
  await prisma.$transaction([
    prisma.sector.update({ where: { code: v.code }, data: { stage: v.stage as Stage } }),
    prisma.stageHistory.create({
      data: {
        sectorCode: v.code,
        stage: v.stage as Stage,
        ratedBy: "human",
        rationale: v.rationale,
      },
    }),
  ]);
  revalidatePath("/");
  revalidatePath(`/sectors/${v.code}`);
  revalidatePath("/rerate");
}

const applySchema = z.array(
  z.object({
    sector: z.string().min(2).max(2),
    stage: z.enum(STAGES),
    rationale: z.string().trim().max(1000),
  }),
);

/** Apply analyst re-rate proposals — the human action the analyst can never take itself. */
export async function applyRerateAction(
  ratings: { sector: string; stage: string; rationale: string }[],
) {
  const rows = applySchema.parse(ratings);
  let applied = 0;
  for (const row of rows) {
    const sector = await prisma.sector.findUnique({ where: { code: row.sector } });
    if (!sector) continue;
    await prisma.$transaction([
      prisma.sector.update({ where: { code: row.sector }, data: { stage: row.stage as Stage } }),
      prisma.stageHistory.create({
        data: {
          sectorCode: row.sector,
          stage: row.stage as Stage,
          ratedBy: "human",
          rationale: `applied analyst proposal: ${row.rationale}`.slice(0, 900),
        },
      }),
    ]);
    applied += 1;
  }
  revalidatePath("/");
  revalidatePath("/rerate");
  return { applied };
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export async function ackAlertAction(id: number) {
  await prisma.ruleEvent.update({ where: { id: z.number().int().parse(id) }, data: { acked: true } });
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function ackAllAlertsAction() {
  await prisma.ruleEvent.updateMany({ where: { acked: false }, data: { acked: true } });
  revalidatePath("/alerts");
  revalidatePath("/");
}

// ── Manual series ────────────────────────────────────────────────────────────

const seriesSchema = z.object({
  series: z.enum(MANUAL_SERIES),
  d: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, "use YYYY-MM or YYYY-MM-DD")
    .transform((d) => (d.length === 7 ? `${d}-01` : d)),
  value: z.number().finite(),
  note: z.string().trim().max(300).optional(),
});

export async function addManualSeriesAction(input: {
  series: string;
  d: string;
  value: number;
  note?: string;
}) {
  const v = seriesSchema.parse(input);
  await prisma.manualSeries.upsert({
    where: { series_d: { series: v.series, d: v.d } },
    update: { value: v.value, note: v.note || null },
    create: { series: v.series, d: v.d, value: v.value, note: v.note || null },
  });
  revalidatePath("/series");
}

export async function deleteManualSeriesAction(input: { series: string; d: string }) {
  await prisma.manualSeries.delete({
    where: { series_d: { series: input.series, d: input.d } },
  });
  revalidatePath("/series");
}

// ── Catalysts ────────────────────────────────────────────────────────────────

const catalystSchema = z.object({
  d: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  kind: z.enum(["earnings", "deadline", "ipo", "product", "macro"]),
  sectorCode: z.string().min(2).max(2).nullable(),
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z.\-]{1,10}$/)
    .nullable(),
  title: z.string().trim().min(3).max(200),
  note: z.string().trim().max(500).optional(),
});

export async function addCatalystAction(input: {
  d: string | null;
  kind: string;
  sectorCode: string | null;
  symbol: string | null;
  title: string;
  note?: string;
}) {
  const v = catalystSchema.parse(input);
  const existing = await prisma.catalyst.findFirst({
    where: { d: v.d, kind: v.kind, symbol: v.symbol, title: v.title },
  });
  if (!existing) {
    await prisma.catalyst.create({
      data: {
        d: v.d,
        kind: v.kind,
        sectorCode: v.sectorCode,
        symbol: v.symbol,
        title: v.title,
        note: v.note || null,
      },
    });
  }
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function deleteCatalystAction(id: number) {
  await prisma.catalyst.delete({ where: { id: z.number().int().parse(id) } });
  revalidatePath("/calendar");
  revalidatePath("/");
}

// ── Positions & journal ──────────────────────────────────────────────────────

const positionSchema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z.\-]{1,10}$/),
  qty: z.number().finite(),
  avgCost: z.number().finite().nonnegative(),
  openedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export async function upsertPositionAction(input: {
  symbol: string;
  qty: number;
  avgCost: number;
  openedAt?: string | null;
}) {
  const v = positionSchema.parse(input);
  await prisma.position.upsert({
    where: { symbol: v.symbol },
    update: { qty: v.qty, avgCost: v.avgCost, openedAt: v.openedAt ?? null },
    create: { symbol: v.symbol, qty: v.qty, avgCost: v.avgCost, openedAt: v.openedAt ?? null },
  });
  revalidatePath("/journal");
  revalidatePath(`/tickers/${v.symbol}`);
}

export async function deletePositionAction(symbol: string) {
  await prisma.position.delete({ where: { symbol } });
  revalidatePath("/journal");
  revalidatePath(`/tickers/${symbol}`);
}

const journalSchema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z.\-]{1,10}$/),
  action: z.enum(["buy", "sell", "trim", "add", "note"]),
  thesis: z.string().trim().min(3).max(2000),
  invalidation: z.string().trim().max(1000).optional(),
});

export async function addJournalAction(input: {
  symbol: string;
  action: string;
  thesis: string;
  invalidation?: string;
}) {
  const v = journalSchema.parse(input);
  await prisma.journalEntry.create({
    data: {
      symbol: v.symbol,
      action: v.action,
      thesis: v.thesis,
      invalidation: v.invalidation || null,
    },
  });
  revalidatePath("/journal");
  revalidatePath(`/tickers/${v.symbol}`);
}

export async function deleteJournalAction(id: number) {
  await prisma.journalEntry.delete({ where: { id: z.number().int().parse(id) } });
  revalidatePath("/journal");
}

// ── Ticker admin ─────────────────────────────────────────────────────────────

const addTickerSchema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z.\-]{1,10}$/),
  klass: z.enum(["stock", "etf", "benchmark"]),
  sectors: z.array(z.string().min(2).max(2)).max(12),
});

export async function addTickerAction(input: {
  symbol: string;
  klass: string;
  sectors: string[];
}) {
  const v = addTickerSchema.parse(input);
  await prisma.ticker.upsert({
    where: { symbol: v.symbol },
    update: { active: true, class: v.klass as TickerClass },
    create: { symbol: v.symbol, class: v.klass as TickerClass, active: true },
  });
  for (const sectorCode of v.sectors) {
    await prisma.tickerSector.upsert({
      where: { symbol_sectorCode: { symbol: v.symbol, sectorCode } },
      update: {},
      create: { symbol: v.symbol, sectorCode },
    });
  }
  revalidatePath("/tickers");
}

export async function setTickerActiveAction(input: { symbol: string; active: boolean }) {
  await prisma.ticker.update({
    where: { symbol: input.symbol },
    data: { active: input.active },
  });
  revalidatePath("/tickers");
  revalidatePath(`/tickers/${input.symbol}`);
}

export async function setSymbolOverrideAction(input: { symbol: string; yfSymbol: string }) {
  const symbol = input.symbol.trim().toUpperCase();
  const yfSymbol = input.yfSymbol.trim();
  if (!yfSymbol) {
    await prisma.symbolOverride.deleteMany({ where: { symbol } });
  } else {
    await prisma.symbolOverride.upsert({
      where: { symbol },
      update: { yfSymbol },
      create: { symbol, yfSymbol },
    });
  }
  revalidatePath("/tickers");
}

// ── Ops ──────────────────────────────────────────────────────────────────────

export async function testNtfyAction(): Promise<boolean> {
  return sendNtfy({
    severity: "info",
    title: "engine",
    message: "Test push from the Ops page — pipes are connected.",
  });
}

export async function runEventModeAction(event: string): Promise<{ ok: boolean; detail: string }> {
  const text = z.string().trim().min(5).max(500).parse(event);
  const result = await runJob("event", () => runAnalyst("event_mode", { event: text }));
  revalidatePath("/briefs");
  revalidatePath("/ops");
  return result;
}

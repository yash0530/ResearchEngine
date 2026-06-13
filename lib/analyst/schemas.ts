import { z } from "zod";
import { STAGES } from "../../config/sectors";

export const NightlyBriefSchema = z.object({
  brief_md: z.string().min(1),
  flags: z.array(z.string()).default([]),
  watch_today: z.array(z.string()).default([]),
});
export type NightlyBrief = z.infer<typeof NightlyBriefSchema>;

export const SectorRerateSchema = z.object({
  sector: z.string(),
  stage: z.enum(STAGES),
  changed: z.boolean(),
  rationale: z.string(),
});

export const MonthlyRerateSchema = z.object({
  ratings: z.array(SectorRerateSchema),
});
export type MonthlyRerate = z.infer<typeof MonthlyRerateSchema>;

// The snapshot is the ONLY model input. Schema doubles as a smoke-test contract.
export const SnapshotSchema = z.object({
  date: z.string().nullable(),
  // Macro anchor: the hyperscaler basket funds Driver-1 (8 of 12 sectors); HYG/IEF is the
  // financing-stress proxy. Sectors are read RELATIVE to this, not in isolation.
  market: z.object({
    hyperscaler_1d: z.number().nullable(),
    hyperscaler_30d: z.number().nullable(),
    credit_30d: z.number().nullable(),
  }),
  sectors: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      stage: z.string(),
      driver: z.number(),
      avg_1d: z.number().nullable(),
      avg_7d: z.number().nullable(),
      avg_30d: z.number().nullable(),
      // 30d sector move minus the hyperscaler basket — the picks-and-shovels-vs-buyers tell.
      vs_hyperscaler_30d: z.number().nullable(),
    }),
  ),
  top_movers: z.array(
    z.object({ symbol: z.string(), sector: z.string(), pct_1d: z.number() }),
  ),
  fired_rules_7d: z.array(
    z.object({
      rule_id: z.string(),
      severity: z.string(),
      message: z.string(),
      fired_at: z.string(),
    }),
  ),
  headlines: z.record(z.string(), z.array(z.string())),
  catalysts_next_14d: z.array(
    z.object({
      d: z.string(),
      kind: z.string(),
      symbol: z.string().nullable(),
      title: z.string(),
    }),
  ),
  manual_series_latest: z.record(
    z.string(),
    z.object({ d: z.string(), value: z.number() }),
  ),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

// Morning digest. Build the deterministic synthesis (the source of truth), optionally
// layer an LLM editor's note on top, and persist one Digest row the dashboard renders
// as its hero. No push, ever — this is a check-once-a-morning surface.
//
// Ordering matters: run this LAST in the overnight chain, after prices/news/earnings/
// rules (and the nightly brief), so the digest summarizes a fully-refreshed board.

import { prisma } from "../prisma";
import { buildDigestData } from "../research/synthesize";
import { narrateDigest } from "../research/llm";

export async function runMorning(): Promise<string> {
  const data = await buildDigestData();
  const narrative = await narrateDigest(data); // null when analyst off / no key / failed

  const digest = await prisma.digest.create({
    data: {
      d: data.asOf ?? new Date().toISOString().slice(0, 10),
      dataJson: JSON.stringify(data),
      llmMd: narrative?.md ?? null,
      llmProvider: narrative?.provider ?? null,
      llmModel: narrative?.model ?? null,
    },
  });

  const narr = narrative
    ? `, narrated via ${narrative.provider}/${narrative.model}`
    : " (deterministic only — LLM disabled/no key)";
  return `digest #${digest.id} for ${data.asOf ?? "—"}: ${data.counts.insightsTotal} insight(s), ${data.counts.criticals} critical${narr}`;
}

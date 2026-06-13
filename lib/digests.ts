// Digest archive loaders. Read-only over the persisted Digest rows the morning job writes,
// so you can review past mornings (did a signal persist? how did the board evolve?).

import { prisma } from "./prisma";
import type { DigestData } from "./research/synthesize";

export type DigestSummary = {
  id: number;
  d: string;
  createdAt: Date;
  headline: string;
  insightsTotal: number;
  criticals: number;
  llmProvider: string | null;
  llmModel: string | null;
};

/** PURE: derive the archive-row summary from a stored dataJson string. Malformed JSON →
 *  safe fallback so one bad row never breaks the list. */
export function summarizeDigestRow(dataJson: string): {
  headline: string;
  insightsTotal: number;
  criticals: number;
} {
  try {
    const data = JSON.parse(dataJson) as DigestData;
    return {
      headline: data.headline ?? "",
      insightsTotal: data.counts?.insightsTotal ?? data.insights?.length ?? 0,
      criticals: data.counts?.criticals ?? 0,
    };
  } catch {
    return { headline: "(unreadable digest)", insightsTotal: 0, criticals: 0 };
  }
}

export async function loadDigestList(limit = 60): Promise<DigestSummary[]> {
  const rows = await prisma.digest.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((row) => ({
    id: row.id,
    d: row.d,
    createdAt: row.createdAt,
    ...summarizeDigestRow(row.dataJson),
    llmProvider: row.llmProvider,
    llmModel: row.llmModel,
  }));
}

export type DigestDetail = {
  id: number;
  createdAt: Date;
  data: DigestData;
  llmMd: string | null;
  llmProvider: string | null;
  llmModel: string | null;
};

export async function loadDigestById(id: number): Promise<DigestDetail | null> {
  const row = await prisma.digest.findUnique({ where: { id } });
  if (!row) return null;
  let data: DigestData;
  try {
    data = JSON.parse(row.dataJson) as DigestData;
  } catch {
    return null; // malformed row — treat as not found rather than crash
  }
  return {
    id: row.id,
    createdAt: row.createdAt,
    data,
    llmMd: row.llmMd,
    llmProvider: row.llmProvider,
    llmModel: row.llmModel,
  };
}

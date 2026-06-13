// Optional LLM enrichment for the morning digest. It writes a short editor's note
// ON TOP of the already-computed, provenance-backed DigestData — it never sees raw
// data it could misread, never invents, and never blocks the digest: any failure
// (disabled, no key, bad output, network) returns null and the deterministic digest
// stands on its own. This is the accuracy-preserving way to use a model here.

import { settings } from "../../config/settings";
import { PROVIDER_PROFILES } from "../../config/providers";
import { complete } from "../analyst/providers";
import { jsonsafe } from "../analyst/jsonsafe";
import type { DigestData } from "./synthesize";

export type DigestNarrative = { md: string; provider: string; model: string };

const SYSTEM = `You are the editor of a personal AI-infrastructure investing RESEARCH dashboard.
You receive a JSON list of ALREADY-COMPUTED, provenance-backed insights for this morning.
Write a tight editor's note that PRIORITIZES and CONNECTS them into a read of the morning.
Ground every statement in a provided insight; never invent numbers, names, or events; never
contradict the data; never give buy/sell/hold advice — this is research, not advice. If the
data is thin or stale, say so plainly.
Output VALID JSON ONLY: {"note_md": "<=160 words of GitHub-flavored markdown"}.
No prose outside JSON, no markdown fences.`;

/** Compact, model-facing projection of the digest — insights + their evidence only. */
function buildUser(d: DigestData): string {
  const compact = {
    as_of: d.asOf,
    stale: d.freshness.stale,
    market: d.market,
    headline: d.headline,
    insights: d.insights.map((i) => ({
      sev: i.severity,
      kind: i.kind,
      point: i.headline,
      evidence: i.evidence,
    })),
    catalysts: d.catalysts.slice(0, 6),
  };
  return `Insights JSON:\n${JSON.stringify(compact)}\n\nWrite the editor's note now.`;
}

export async function narrateDigest(d: DigestData): Promise<DigestNarrative | null> {
  if (!settings.analyst.enabled) return null;
  const profileName = settings.analyst.nightly;
  const profile = PROVIDER_PROFILES[profileName];
  if (!profile) return null;
  // Keyed providers need their key present; keyless local servers (apiKeyEnv null) are fine.
  if (profile.apiKeyEnv && !process.env[profile.apiKeyEnv]) return null;

  try {
    const res = await complete(profileName, profile, { system: SYSTEM, user: buildUser(d) });
    const parsed = jsonsafe(res.text) as { note_md?: unknown } | null;
    const md = typeof parsed?.note_md === "string" ? parsed.note_md.trim() : "";
    if (!md) return null;
    return { md, provider: profileName, model: res.model };
  } catch {
    // Enrichment is best-effort. The deterministic digest is the source of truth.
    return null;
  }
}

// Analyst orchestration: snapshot → provider → jsonsafe → zod, one retry with
// the validation error, then store. Sector stages are NEVER auto-applied —
// monthly proposals land in StageHistory for a human to apply on /rerate.

import { Stage } from "@prisma/client";
import { prisma } from "../prisma";
import { settings } from "../../config/settings";
import { PROVIDER_PROFILES } from "../../config/providers";
import { buildSnapshot } from "./snapshot";
import { buildPrompt, type AnalystKind } from "./prompts";
import { complete } from "./providers";
import { jsonsafe } from "./jsonsafe";
import { MonthlyRerateSchema, NightlyBriefSchema } from "./schemas";
import { STAGES } from "../../config/sectors";

export type AnalystOptions = {
  event?: string;
  dryRun?: boolean;
  /** One-off profile override (e.g. CLI --provider=ollama_local). */
  providerOverride?: string;
};

function profileNameFor(kind: AnalystKind): string {
  if (kind === "nightly") return settings.analyst.nightly;
  if (kind === "monthly_rerate") return settings.analyst.monthly;
  return settings.analyst.event;
}

export async function runAnalyst(kind: AnalystKind, opts: AnalystOptions = {}): Promise<string> {
  if (!settings.analyst.enabled) return "skipped (analyst disabled)";

  const snapshot = await buildSnapshot();
  if (opts.dryRun) {
    console.log(JSON.stringify(snapshot, null, 2));
    return `dry-run: snapshot printed (${JSON.stringify(snapshot).length} chars), no API call`;
  }

  const profileName = opts.providerOverride ?? profileNameFor(kind);
  const profile = PROVIDER_PROFILES[profileName];
  if (!profile) {
    throw new Error(`no provider profile named '${profileName}' in config/providers.ts`);
  }

  const { system, user } = buildPrompt(kind, snapshot, opts.event);
  const schema = kind === "monthly_rerate" ? MonthlyRerateSchema : NightlyBriefSchema;

  let userMessage = user;
  let lastRaw = "";
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await complete(profileName, profile, { system, user: userMessage });
    lastRaw = result.text;

    const parsed = jsonsafe(result.text);
    const validated = parsed === null ? null : schema.safeParse(parsed);
    if (!validated || !validated.success) {
      lastError = validated ? validated.error.message.slice(0, 500) : "no JSON object found in output";
      userMessage = `${user}\nYour previous output failed validation: ${lastError}. Return ONLY valid JSON.`;
      continue;
    }

    const brief = await prisma.brief.create({
      data: {
        kind,
        provider: profileName,
        model: result.model,
        inputJson: JSON.stringify(result.requestBody),
        outputJson: JSON.stringify(validated.data),
        ok: true,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });

    let extra = "";
    if (kind === "monthly_rerate") {
      const data = validated.data as { ratings: { sector: string; stage: string; changed: boolean; rationale: string }[] };
      const changed = data.ratings.filter(
        (r) => r.changed && (STAGES as readonly string[]).includes(r.stage),
      );
      for (const rating of changed) {
        const sector = await prisma.sector.findUnique({ where: { code: rating.sector } });
        if (!sector) continue; // model named an unknown sector — proposal dropped
        await prisma.stageHistory.create({
          data: {
            sectorCode: rating.sector,
            stage: rating.stage as Stage,
            ratedBy: `analyst:${result.model}`,
            rationale: rating.rationale,
          },
        });
      }
      extra = `, ${changed.length} stage change(s) proposed`;
    }

    return `brief #${brief.id} stored via ${profileName}/${result.model} (${result.inputTokens ?? "?"}/${result.outputTokens ?? "?"} tok)${extra}`;
  }

  // Both attempts failed validation: keep the raw output for the audit trail,
  // then throw so the job wrapper records the failure and pushes the warn.
  await prisma.brief.create({
    data: {
      kind,
      provider: profileName,
      model: profile.model,
      inputJson: JSON.stringify({ system, user }),
      outputJson: lastRaw,
      ok: false,
    },
  });
  throw new Error(`analyst output invalid (${profileName}): ${lastError}`);
}

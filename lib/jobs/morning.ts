// 07:30 push: latest good nightly brief (if reasonably fresh) to the phone.

import { prisma } from "../prisma";
import { sendNtfy } from "../notify";

const FRESH_MS = 36 * 3600_000; // today's or yesterday-evening's brief

export async function runMorning(): Promise<string> {
  const brief = await prisma.brief.findFirst({
    where: { kind: "nightly", ok: true },
    orderBy: { createdAt: "desc" },
  });

  if (!brief || Date.now() - brief.createdAt.getTime() > FRESH_MS) {
    await sendNtfy({ severity: "info", title: "engine", message: "engine: no brief available" });
    return "no fresh brief available";
  }

  let text = "";
  try {
    const parsed = JSON.parse(brief.outputJson) as { brief_md?: string };
    text = (parsed.brief_md ?? "").slice(0, 500);
  } catch {
    // ok=true briefs always hold valid JSON, but never let the push job crash
  }
  if (!text) text = "brief is empty — open the dashboard";

  await sendNtfy({ severity: "info", title: "engine · morning brief", message: text });
  return `pushed brief #${brief.id} (${text.length} chars)`;
}

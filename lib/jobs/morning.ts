// 07:30 push: latest good nightly brief (if reasonably fresh) to the phone.

import { prisma } from "../prisma";
import { sendNtfy } from "../notify";

const FRESH_MS = 36 * 3600_000; // today's or yesterday-evening's brief

export async function runMorning(): Promise<string> {
  // Overnight tripwires ride this digest — warns live here (criticals were also paged
  // at fire time). Keeps routine alerts off the phone at 11:30pm but surfaced by 7:30am.
  const since = new Date(Date.now() - 24 * 3600_000);
  const events = await prisma.ruleEvent.findMany({
    where: { firedAt: { gte: since }, severity: { in: ["warn", "critical"] } },
    orderBy: { firedAt: "desc" },
    take: 8,
  });
  const alertLines = events.map((e) => `• ${e.severity.toUpperCase()}: ${e.message}`).join("\n");

  const brief = await prisma.brief.findFirst({
    where: { kind: "nightly", ok: true },
    orderBy: { createdAt: "desc" },
  });
  const fresh = !!brief && Date.now() - brief.createdAt.getTime() <= FRESH_MS;

  let briefText = "";
  if (fresh) {
    try {
      const parsed = JSON.parse(brief!.outputJson) as { brief_md?: string };
      briefText = (parsed.brief_md ?? "").slice(0, 500);
    } catch {
      // ok=true briefs always hold valid JSON, but never let the push job crash
    }
  }

  const sections = [
    briefText || (fresh ? "brief is empty — open the dashboard" : "no fresh brief available"),
  ];
  if (alertLines) sections.push(`— overnight alerts —\n${alertLines}`);

  await sendNtfy({
    severity: events.some((e) => e.severity === "critical") ? "critical" : "info",
    title: "engine · morning brief",
    message: sections.join("\n\n").slice(0, 1000),
  });
  return `pushed brief #${brief?.id ?? "—"} (${briefText.length} chars), ${events.length} overnight alert(s)`;
}

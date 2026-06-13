// The overnight pipeline — the single ordered ETL chain that makes the dashboard
// coherent and fresh by morning. Steps run in dependency order:
//
//   prices → news → earnings → rules → nightly brief → morning digest
//
// Each step is wrapped in runJob, so it records its own JobRun row and CANNOT abort
// the chain: a failed step is counted and the pipeline presses on. The digest is built
// last from whatever data is fresh, and its data-health insight flags any gaps — better
// a partial morning read than no read at all.

import { runJob } from "./runner";
import { runPrices } from "./prices";
import { runNews } from "./news";
import { runEarnings } from "./earnings";
import { runRulesJob } from "../rules/engine";
import { runAnalyst } from "../analyst/runner";
import { runMorning } from "./morning";

export async function runOvernight(): Promise<string> {
  const steps: [string, () => Promise<string>][] = [
    ["prices", () => runPrices({})],
    ["news", () => runNews()],
    ["earnings", () => runEarnings()],
    ["rules", () => runRulesJob({})],
    ["nightly", () => runAnalyst("nightly", {})],
    ["morning", () => runMorning()],
  ];

  const summary: string[] = [];
  let failures = 0;
  for (const [name, fn] of steps) {
    const res = await runJob(name, fn);
    summary.push(`${name}:${res.ok ? "ok" : "FAIL"}`);
    if (!res.ok) failures += 1;
  }
  return `${summary.join(" · ")}${failures ? ` — ${failures} step(s) failed` : ""}`;
}

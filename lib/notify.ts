// Phone push via ntfy. Plain fetch, never throws, no-op when disabled.

import { settings } from "../config/settings";

const PRIORITY: Record<string, string> = { info: "3", warn: "4", critical: "5" };

export async function sendNtfy(opts: {
  message: string;
  title?: string;
  severity?: "info" | "warn" | "critical";
}): Promise<boolean> {
  const { enabled, url, topic } = settings.ntfy;
  if (!enabled || !topic) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${topic}`, {
      method: "POST",
      body: opts.message,
      headers: {
        Title: opts.title ?? "engine",
        Priority: PRIORITY[opts.severity ?? "info"] ?? "3",
      },
      signal: controller.signal,
    });
    return res.status < 300;
  } catch (error) {
    console.log(`ntfy failed: ${error instanceof Error ? error.message : error}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../prisma";
import { settings } from "../../config/settings";
import { todayStr } from "../dates";

/** VACUUM INTO a dated snapshot, prune to the newest `keep`. */
export async function runBackup(): Promise<string> {
  const dir = path.resolve(settings.backups.dir);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `engine-${todayStr()}.db`);
  // VACUUM INTO refuses to overwrite and must run outside a transaction.
  if (fs.existsSync(target)) fs.rmSync(target);
  await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replaceAll("'", "''")}'`);

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^engine-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort();
  for (const f of files.slice(0, Math.max(0, files.length - settings.backups.keep))) {
    fs.rmSync(path.join(dir, f));
  }
  return `${path.basename(target)} written, ${Math.min(files.length, settings.backups.keep)} kept`;
}

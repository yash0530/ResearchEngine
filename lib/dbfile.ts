import path from "node:path";

/** Filesystem path of the SQLite database behind a `file:` DATABASE_URL. */
export function resolveSqlitePath(url: string = process.env.DATABASE_URL || "file:./dev.db"): string {
  const raw = url.replace(/^file:/, "").replace(/\?.*$/, "");
  if (path.isAbsolute(raw)) return raw;
  // Prisma resolves relative SQLite paths against the schema directory.
  return path.resolve("prisma", raw);
}

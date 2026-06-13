// Google News RSS per sector. Dedupe by sha1(url), keep a rolling window.

import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { settings } from "../../config/settings";
import { SECTOR_SEEDS } from "../../config/sectors";

type Item = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  sourceName?: unknown;
  contentSnippet?: string;
  content?: string;
};

const parser: Parser<Record<string, unknown>, Item> = new Parser({
  // Google News' <source> tag carries the publisher name as element text.
  customFields: { item: [["source", "sourceName"]] },
  headers: {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  },
  timeout: 15000,
});

function sourceText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "_" in value) {
    const text = (value as { _?: unknown })._;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return null;
}

/** Google News titles end with " - Publisher"; store the headline alone. */
function cleanTitle(title: string, source: string | null): string {
  if (!source) return title;
  for (const sep of [" - ", " – ", " — "]) {
    const suffix = `${sep}${source}`;
    if (title.endsWith(suffix)) return title.slice(0, -suffix.length).trim();
  }
  return title;
}

/** RSS description → compact plain text. Drop it when it's empty or just the title;
 *  synthesis and the analyst snapshot read this for context beyond the headline. */
function cleanSnippet(raw: string | undefined, title: string): string | null {
  if (!raw) return null;
  const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text || text === title) return null;
  return text.slice(0, 400);
}

export async function runNews(): Promise<string> {
  let added = 0;
  const failed: string[] = [];

  for (const sector of SECTOR_SEEDS) {
    const params = new URLSearchParams({
      q: `${sector.newsQuery} when:2d`,
      hl: "en-US",
      gl: "US",
      ceid: "US:en",
    });
    const url = `https://news.google.com/rss/search?${params}`;
    try {
      const feed = await parser.parseURL(url);
      for (const item of (feed.items ?? []).slice(0, settings.news.maxPerSector)) {
        if (!item.link || !item.title) continue;
        const urlHash = createHash("sha1").update(item.link).digest("hex");
        const publishedRaw = item.isoDate ?? item.pubDate;
        const publishedAt = publishedRaw ? new Date(publishedRaw) : null;
        const source = sourceText(item.sourceName);
        const title = cleanTitle(item.title, source);
        try {
          await prisma.newsItem.create({
            data: {
              urlHash,
              url: item.link,
              title,
              snippet: cleanSnippet(item.contentSnippet ?? item.content, title),
              source,
              sectorCode: sector.code,
              publishedAt:
                publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
            },
          });
          added += 1;
        } catch (error) {
          // Duplicate url_hash → already stored (possibly under another sector). Skip.
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
          ) {
            throw error;
          }
        }
      }
    } catch (error) {
      failed.push(sector.code);
      console.log(
        `news: sector ${sector.code} failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  const cutoff = new Date(Date.now() - settings.news.keepDays * 86_400_000);
  const pruned = await prisma.newsItem.deleteMany({ where: { fetchedAt: { lt: cutoff } } });

  return `added ${added}, pruned ${pruned.count}${failed.length ? `, failed sectors: ${failed.join(",")}` : ""}`;
}

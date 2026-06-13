import "dotenv/config";

import { PrismaClient, Stage, TickerClass } from "@prisma/client";
import {
  ALL_SEED_SYMBOLS,
  BENCHMARKS,
  SECTOR_SEEDS,
  STATIC_CATALYSTS,
} from "../config/sectors";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ENGINE...");

  // Sectors. Stage is set only on create — re-seeding never clobbers a human rating.
  for (const seed of SECTOR_SEEDS) {
    await prisma.sector.upsert({
      where: { code: seed.code },
      update: { name: seed.name, driver: seed.driver, note: seed.note },
      create: {
        code: seed.code,
        name: seed.name,
        driver: seed.driver,
        stage: seed.stage as Stage,
        note: seed.note,
      },
    });

    const seedRating = await prisma.stageHistory.findFirst({
      where: { sectorCode: seed.code, ratedBy: "seed" },
    });
    if (!seedRating) {
      await prisma.stageHistory.create({
        data: {
          sectorCode: seed.code,
          stage: seed.stage as Stage,
          ratedBy: "seed",
          rationale: "Initial seed rating",
        },
      });
    }
  }

  // Sector-member tickers. Class/active untouched on update so manual edits survive.
  for (const symbol of ALL_SEED_SYMBOLS) {
    await prisma.ticker.upsert({
      where: { symbol },
      update: {},
      create: { symbol, class: TickerClass.stock, active: true },
    });
  }

  for (const bench of BENCHMARKS) {
    await prisma.ticker.upsert({
      where: { symbol: bench.symbol },
      update: { name: bench.name },
      create: {
        symbol: bench.symbol,
        class: TickerClass.benchmark,
        active: true,
        name: bench.name,
      },
    });
  }

  // Membership links (many-to-many).
  for (const seed of SECTOR_SEEDS) {
    for (const symbol of seed.tickers) {
      await prisma.tickerSector.upsert({
        where: { symbol_sectorCode: { symbol, sectorCode: seed.code } },
        update: {},
        create: { symbol, sectorCode: seed.code },
      });
    }
  }

  // Static catalysts. The unique index contains nullable columns (SQLite treats
  // NULLs as distinct), so dedupe in app code instead of upserting.
  for (const cat of STATIC_CATALYSTS) {
    const existing = await prisma.catalyst.findFirst({
      where: { d: cat.d, kind: cat.kind, symbol: cat.symbol, title: cat.title },
    });
    if (!existing) {
      await prisma.catalyst.create({
        data: {
          d: cat.d,
          kind: cat.kind,
          sectorCode: cat.sectorCode,
          symbol: cat.symbol,
          title: cat.title,
        },
      });
    }
  }

  const [sectors, tickers, links, catalysts] = await Promise.all([
    prisma.sector.count(),
    prisma.ticker.count(),
    prisma.tickerSector.count(),
    prisma.catalyst.count(),
  ]);
  console.log(
    `Seeded: ${sectors} sectors, ${tickers} tickers (${links} sector links), ${catalysts} catalysts.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

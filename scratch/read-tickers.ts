import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const tickers = await prisma.ticker.findMany({
    where: { active: true },
    take: 10
  });
  console.log("Found tickers:");
  for (const t of tickers) {
    console.log(t.symbol, {
      name: t.name,
      marketCap: t.marketCap,
      forwardPE: t.forwardPE,
      trailingPE: t.trailingPE,
      profitMargin: t.profitMargin,
      statsUpdatedAt: t.statsUpdatedAt
    });
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

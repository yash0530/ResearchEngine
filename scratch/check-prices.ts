import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const symbol = "AAON";
  const prices = await prisma.price.findMany({
    where: { symbol },
    orderBy: { d: "asc" },
  });
  console.log(`Found ${prices.length} price rows for ${symbol}.`);
  if (prices.length > 0) {
    console.log("First 5:", prices.slice(0, 5));
    console.log("Last 5:", prices.slice(-5));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

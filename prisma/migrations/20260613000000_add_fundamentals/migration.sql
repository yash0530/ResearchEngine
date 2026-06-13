-- AlterTable
ALTER TABLE "Ticker" ADD COLUMN "marketCap" REAL;
ALTER TABLE "Ticker" ADD COLUMN "forwardPE" REAL;
ALTER TABLE "Ticker" ADD COLUMN "trailingPE" REAL;
ALTER TABLE "Ticker" ADD COLUMN "profitMargin" REAL;
ALTER TABLE "Ticker" ADD COLUMN "revenueGrowth" REAL;
ALTER TABLE "Ticker" ADD COLUMN "fiftyTwoWeekHigh" REAL;
ALTER TABLE "Ticker" ADD COLUMN "fiftyTwoWeekLow" REAL;
ALTER TABLE "Ticker" ADD COLUMN "beta" REAL;
ALTER TABLE "Ticker" ADD COLUMN "eps" REAL;
ALTER TABLE "Ticker" ADD COLUMN "dividendYield" REAL;
ALTER TABLE "Ticker" ADD COLUMN "yearChange" REAL;
ALTER TABLE "Ticker" ADD COLUMN "statsUpdatedAt" DATETIME;

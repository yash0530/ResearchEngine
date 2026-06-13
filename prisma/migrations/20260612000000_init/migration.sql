PRAGMA journal_mode=WAL;

-- CreateTable
CREATE TABLE "Sector" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "driver" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'early',
    "note" TEXT
);

-- CreateTable
CREATE TABLE "StageHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sectorCode" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "ratedBy" TEXT NOT NULL,
    "rationale" TEXT,
    "ratedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageHistory_sectorCode_fkey" FOREIGN KEY ("sectorCode") REFERENCES "Sector" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ticker" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "class" TEXT NOT NULL DEFAULT 'stock',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "TickerSector" (
    "symbol" TEXT NOT NULL,
    "sectorCode" TEXT NOT NULL,

    PRIMARY KEY ("symbol", "sectorCode"),
    CONSTRAINT "TickerSector_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "Ticker" ("symbol") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TickerSector_sectorCode_fkey" FOREIGN KEY ("sectorCode") REFERENCES "Sector" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Price" (
    "symbol" TEXT NOT NULL,
    "d" TEXT NOT NULL,
    "close" REAL NOT NULL,
    "volume" REAL,

    PRIMARY KEY ("symbol", "d")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "urlHash" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "sectorCode" TEXT,
    "symbol" TEXT,
    "publishedAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Catalyst" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "d" TEXT,
    "kind" TEXT NOT NULL,
    "sectorCode" TEXT,
    "symbol" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT
);

-- CreateTable
CREATE TABLE "ManualSeries" (
    "series" TEXT NOT NULL,
    "d" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "note" TEXT,

    PRIMARY KEY ("series", "d")
);

-- CreateTable
CREATE TABLE "RuleEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ruleId" TEXT NOT NULL,
    "firedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acked" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER
);

-- CreateTable
CREATE TABLE "Position" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "qty" REAL NOT NULL,
    "avgCost" REAL NOT NULL,
    "openedAt" TEXT
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "thesis" TEXT NOT NULL,
    "invalidation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "detail" TEXT
);

-- CreateTable
CREATE TABLE "SymbolOverride" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "yfSymbol" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "StageHistory_sectorCode_ratedAt_idx" ON "StageHistory"("sectorCode", "ratedAt");

-- CreateIndex
CREATE INDEX "TickerSector_sectorCode_idx" ON "TickerSector"("sectorCode");

-- CreateIndex
CREATE INDEX "Price_d_idx" ON "Price"("d");

-- CreateIndex
CREATE INDEX "NewsItem_sectorCode_fetchedAt_idx" ON "NewsItem"("sectorCode", "fetchedAt");

-- CreateIndex
CREATE INDEX "NewsItem_fetchedAt_idx" ON "NewsItem"("fetchedAt");

-- CreateIndex
CREATE INDEX "Catalyst_d_idx" ON "Catalyst"("d");

-- CreateIndex
CREATE UNIQUE INDEX "Catalyst_d_kind_symbol_title_key" ON "Catalyst"("d", "kind", "symbol", "title");

-- CreateIndex
CREATE INDEX "RuleEvent_ruleId_firedAt_idx" ON "RuleEvent"("ruleId", "firedAt");

-- CreateIndex
CREATE INDEX "RuleEvent_acked_firedAt_idx" ON "RuleEvent"("acked", "firedAt");

-- CreateIndex
CREATE INDEX "Brief_kind_createdAt_idx" ON "Brief"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_symbol_createdAt_idx" ON "JournalEntry"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "JobRun_job_startedAt_idx" ON "JobRun"("job", "startedAt");


-- AlterTable: capture the RSS description so synthesis sees more than headlines
ALTER TABLE "NewsItem" ADD COLUMN "snippet" TEXT;

-- CreateTable: persisted morning Digest (deterministic synthesis + optional LLM prose)
CREATE TABLE "Digest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "d" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataJson" TEXT NOT NULL,
    "llmMd" TEXT,
    "llmProvider" TEXT,
    "llmModel" TEXT
);

-- CreateIndex
CREATE INDEX "Digest_createdAt_idx" ON "Digest"("createdAt");

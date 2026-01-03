-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contextBullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contextMetadata" JSONB,
ADD COLUMN     "contextSummary" TEXT,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "noveltyAngles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "noveltyScore" DOUBLE PRECISION,
ADD COLUMN     "originalText" TEXT,
ADD COLUMN     "qualityReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "qualityVerdict" TEXT,
ADD COLUMN     "studyPrompts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topicId" TEXT,
ADD COLUMN     "translationProvider" TEXT;

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "primaryLanguage" TEXT;

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "subcategory" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "professional" BOOLEAN NOT NULL DEFAULT false,
    "randomEligible" BOOLEAN NOT NULL DEFAULT true,
    "defaultMode" TEXT NOT NULL DEFAULT 'quen-3.4b',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "topicId" TEXT,
    "reason" TEXT NOT NULL,
    "rank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "required" INTEGER NOT NULL DEFAULT 5,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPrefs" (
    "userId" TEXT NOT NULL,
    "locale" TEXT,
    "quietHours" JSONB,
    "topicsLiked" JSONB,
    "topicsMuted" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrefs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedStory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "itemId" TEXT,
    "sourceUrl" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "audience" TEXT NOT NULL DEFAULT 'beta',
    "partnerTargets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noveltyAngle" TEXT,
    "contextSummary" TEXT,
    "studyPrompts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "originalLanguage" TEXT,
    "translationProvider" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "LearningPath_userId_status_idx" ON "LearningPath"("userId", "status");

-- CreateIndex
CREATE INDEX "Event_userId_ts_idx" ON "Event"("userId", "ts");

-- CreateIndex
CREATE INDEX "Achievement_userId_code_idx" ON "Achievement"("userId", "code");

-- CreateIndex
CREATE INDEX "SharedStory_status_createdAt_idx" ON "SharedStory"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPrefs" ADD CONSTRAINT "UserPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedStory" ADD CONSTRAINT "SharedStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedStory" ADD CONSTRAINT "SharedStory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

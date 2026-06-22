-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VisionMapRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "appsJson" TEXT NOT NULL DEFAULT '[]',
    "nodesJson" TEXT NOT NULL,
    "connectionsJson" TEXT NOT NULL DEFAULT '[]',
    "palette" TEXT NOT NULL DEFAULT 'anclora',
    "tags" TEXT NOT NULL DEFAULT '',
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "promptVersion" TEXT,
    "llmModel" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AncloraAppRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL DEFAULT 'Tool',
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "stackJson" TEXT NOT NULL DEFAULT '[]',
    "capabilitiesJson" TEXT NOT NULL DEFAULT '[]',
    "accent" TEXT NOT NULL DEFAULT '#1dab89',
    "domain" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "githubUrl" TEXT,
    "readme" TEXT NOT NULL DEFAULT '',
    "agentsMd" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "VisionMapRecord_starred_idx" ON "VisionMapRecord"("starred");

-- CreateIndex
CREATE INDEX "VisionMapRecord_createdAt_idx" ON "VisionMapRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AncloraAppRecord_slug_key" ON "AncloraAppRecord"("slug");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_family_idx" ON "AncloraAppRecord"("family");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_source_idx" ON "AncloraAppRecord"("source");

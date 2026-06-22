-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionMapRecord" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "appsJson" TEXT NOT NULL DEFAULT '[]',
    "nodesJson" TEXT NOT NULL,
    "connectionsJson" TEXT NOT NULL DEFAULT '[]',
    "palette" TEXT NOT NULL DEFAULT 'anclora',
    "tags" TEXT NOT NULL DEFAULT '',
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "promptVersion" TEXT,
    "llmModel" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionMapRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AncloraAppRecord" (
    "id" TEXT NOT NULL,
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
    "workspaceId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "commitSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AncloraAppRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapExport" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "format" VARCHAR(10) NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "MapExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_role_idx" ON "WorkspaceMember"("workspaceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "VisionMapRecord_starred_idx" ON "VisionMapRecord"("starred");

-- CreateIndex
CREATE INDEX "VisionMapRecord_createdAt_idx" ON "VisionMapRecord"("createdAt");

-- CreateIndex
CREATE INDEX "VisionMapRecord_workspaceId_updatedAt_idx" ON "VisionMapRecord"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "VisionMapRecord_workspaceId_status_idx" ON "VisionMapRecord"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "VisionMapRecord_workspaceId_starred_idx" ON "VisionMapRecord"("workspaceId", "starred");

-- CreateIndex
CREATE INDEX "VisionMapRecord_ownerId_idx" ON "VisionMapRecord"("ownerId");

-- CreateIndex
CREATE INDEX "VisionMapRecord_approvedById_idx" ON "VisionMapRecord"("approvedById");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_family_idx" ON "AncloraAppRecord"("family");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_source_idx" ON "AncloraAppRecord"("source");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_workspaceId_family_idx" ON "AncloraAppRecord"("workspaceId", "family");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_workspaceId_source_idx" ON "AncloraAppRecord"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_workspaceId_status_idx" ON "AncloraAppRecord"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AncloraAppRecord_reviewedById_idx" ON "AncloraAppRecord"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "AncloraAppRecord_workspaceId_slug_key" ON "AncloraAppRecord"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MapExport_blobHash_key" ON "MapExport"("blobHash");

-- CreateIndex
CREATE INDEX "MapExport_mapId_idx" ON "MapExport"("mapId");

-- CreateIndex
CREATE INDEX "MapExport_uploadedAt_idx" ON "MapExport"("uploadedAt");

-- CreateIndex
CREATE INDEX "MapExport_expiresAt_idx" ON "MapExport"("expiresAt");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionMapRecord" ADD CONSTRAINT "VisionMapRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionMapRecord" ADD CONSTRAINT "VisionMapRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionMapRecord" ADD CONSTRAINT "VisionMapRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncloraAppRecord" ADD CONSTRAINT "AncloraAppRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncloraAppRecord" ADD CONSTRAINT "AncloraAppRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapExport" ADD CONSTRAINT "MapExport_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "VisionMapRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

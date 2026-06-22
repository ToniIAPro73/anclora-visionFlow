-- Canonical single-workspace compatibility foundation for TASK-1001.
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "Workspace" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES (
    'workspace_anclora_internal',
    'Anclora Internal',
    'anclora-internal',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "new_VisionMapRecord" (
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
    "workspaceId" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "promptVersion" TEXT,
    "llmModel" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisionMapRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VisionMapRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VisionMapRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_VisionMapRecord" (
    "id",
    "title",
    "idea",
    "summary",
    "appsJson",
    "nodesJson",
    "connectionsJson",
    "palette",
    "tags",
    "starred",
    "workspaceId",
    "ownerId",
    "status",
    "approvedAt",
    "approvedById",
    "promptVersion",
    "llmModel",
    "tokensUsed",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "title",
    "idea",
    "summary",
    "appsJson",
    "nodesJson",
    "connectionsJson",
    "palette",
    "tags",
    "starred",
    'workspace_anclora_internal',
    NULL,
    'draft',
    NULL,
    NULL,
    "promptVersion",
    "llmModel",
    "tokensUsed",
    "createdAt",
    "updatedAt"
FROM "VisionMapRecord";

DROP TABLE "VisionMapRecord";
ALTER TABLE "new_VisionMapRecord" RENAME TO "VisionMapRecord";

CREATE TABLE "new_AncloraAppRecord" (
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
    "workspaceId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "commitSha" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AncloraAppRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AncloraAppRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AncloraAppRecord" (
    "id",
    "slug",
    "name",
    "family",
    "tagline",
    "description",
    "stackJson",
    "capabilitiesJson",
    "accent",
    "domain",
    "source",
    "githubUrl",
    "readme",
    "agentsMd",
    "workspaceId",
    "reviewedById",
    "reviewedAt",
    "status",
    "commitSha",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "slug",
    "name",
    "family",
    "tagline",
    "description",
    "stackJson",
    "capabilitiesJson",
    "accent",
    "domain",
    "source",
    "githubUrl",
    "readme",
    "agentsMd",
    'workspace_anclora_internal',
    NULL,
    NULL,
    'active',
    NULL,
    "createdAt",
    "updatedAt"
FROM "AncloraAppRecord";

DROP TABLE "AncloraAppRecord";
ALTER TABLE "new_AncloraAppRecord" RENAME TO "AncloraAppRecord";

CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE INDEX "WorkspaceMember_workspaceId_role_idx" ON "WorkspaceMember"("workspaceId", "role");

CREATE INDEX "VisionMapRecord_starred_idx" ON "VisionMapRecord"("starred");
CREATE INDEX "VisionMapRecord_createdAt_idx" ON "VisionMapRecord"("createdAt");
CREATE INDEX "VisionMapRecord_workspaceId_updatedAt_idx" ON "VisionMapRecord"("workspaceId", "updatedAt");
CREATE INDEX "VisionMapRecord_workspaceId_status_idx" ON "VisionMapRecord"("workspaceId", "status");
CREATE INDEX "VisionMapRecord_workspaceId_starred_idx" ON "VisionMapRecord"("workspaceId", "starred");
CREATE INDEX "VisionMapRecord_ownerId_idx" ON "VisionMapRecord"("ownerId");
CREATE INDEX "VisionMapRecord_approvedById_idx" ON "VisionMapRecord"("approvedById");

CREATE UNIQUE INDEX "AncloraAppRecord_workspaceId_slug_key" ON "AncloraAppRecord"("workspaceId", "slug");
CREATE INDEX "AncloraAppRecord_family_idx" ON "AncloraAppRecord"("family");
CREATE INDEX "AncloraAppRecord_source_idx" ON "AncloraAppRecord"("source");
CREATE INDEX "AncloraAppRecord_workspaceId_family_idx" ON "AncloraAppRecord"("workspaceId", "family");
CREATE INDEX "AncloraAppRecord_workspaceId_source_idx" ON "AncloraAppRecord"("workspaceId", "source");
CREATE INDEX "AncloraAppRecord_workspaceId_status_idx" ON "AncloraAppRecord"("workspaceId", "status");
CREATE INDEX "AncloraAppRecord_reviewedById_idx" ON "AncloraAppRecord"("reviewedById");

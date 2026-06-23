-- Migration: fase1_identity_rbac
-- Adds enums MemberRole, CatalogState, AuditAction
-- Updates WorkspaceMember.role to use MemberRole enum
-- Adds AncloraAppRecord.catalogState using CatalogState enum
-- Adds AuditEvent model (append-only)

-- 1. Create enums
CREATE TYPE "MemberRole" AS ENUM ('viewer', 'editor', 'reviewer', 'admin');
CREATE TYPE "CatalogState" AS ENUM ('importado', 'en_revision', 'publicado', 'retirado');
CREATE TYPE "AuditAction" AS ENUM ('import', 'generation', 'status_change', 'export', 'handoff', 'catalog_publish');

-- 2. Migrate WorkspaceMember.role from String to MemberRole enum
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" TYPE "MemberRole" USING "role"::"MemberRole";
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" SET DEFAULT 'viewer';

-- 3. Add catalogState to AncloraAppRecord
ALTER TABLE "AncloraAppRecord" ADD COLUMN "catalogState" "CatalogState" NOT NULL DEFAULT 'importado';

-- 4. Create AuditEvent model (append-only — no UPDATE/DELETE)
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- 5. Add indexes for AuditEvent
CREATE INDEX "AuditEvent_workspaceId_action_idx" ON "AuditEvent"("workspaceId", "action");
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");

-- 6. Add index for AncloraAppRecord catalogState
CREATE INDEX "AncloraAppRecord_workspaceId_catalogState_idx" ON "AncloraAppRecord"("workspaceId", "catalogState");

-- 7. Backfill: promote internal workspace admin
UPDATE "WorkspaceMember"
SET role = 'admin'
WHERE "workspaceId" = 'workspace_anclora_internal'
  AND "userId" IN (SELECT "id" FROM "User" LIMIT 1);

-- 8. Backfill: mark active catalog apps as publicado
UPDATE "AncloraAppRecord"
SET "catalogState" = 'publicado'
WHERE status = 'active';

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('draft', 'review', 'approved', 'handed_off', 'archived');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('captacion_premium', 'comercializacion_activo', 'contexto_energetico', 'campana_territorial', 'propuesta_partner');

-- CreateEnum
CREATE TYPE "EvidenceSensitivity" AS ENUM ('public', 'internal', 'confidential', 'restricted');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('manual', 'datalab_insight_card', 'energyscan_reference');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'acknowledged', 'failed');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "CaseType" NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'draft',
    "brief" JSONB NOT NULL,
    "paletteId" TEXT NOT NULL DEFAULT 'anclora',
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionMapVersion" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "map" JSONB NOT NULL,
    "promptVersion" TEXT,
    "llmModel" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisionMapVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceReference" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "hash" TEXT,
    "sensitivity" "EvidenceSensitivity" NOT NULL DEFAULT 'internal',
    "kind" "EvidenceKind" NOT NULL DEFAULT 'manual',
    "sourceVersion" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reviewState" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefExport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'content-generator-ai',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SddExport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "prUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SddExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoffDraft" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoffDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationDelivery" (
    "id" TEXT NOT NULL,
    "handoffDraftId" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'nexus',
    "endpoint" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Case_workspaceId_status_idx" ON "Case"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Case_workspaceId_type_idx" ON "Case"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "VisionMapVersion_caseId_version_key" ON "VisionMapVersion"("caseId", "version");

-- CreateIndex
CREATE INDEX "VisionMapVersion_caseId_idx" ON "VisionMapVersion"("caseId");

-- CreateIndex
CREATE INDEX "EvidenceReference_caseId_sensitivity_idx" ON "EvidenceReference"("caseId", "sensitivity");

-- CreateIndex
CREATE INDEX "BriefExport_workspaceId_caseId_idx" ON "BriefExport"("workspaceId", "caseId");

-- CreateIndex
CREATE INDEX "SddExport_workspaceId_caseId_idx" ON "SddExport"("workspaceId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "HandoffDraft_idempotencyKey_key" ON "HandoffDraft"("idempotencyKey");

-- CreateIndex
CREATE INDEX "HandoffDraft_workspaceId_caseId_idx" ON "HandoffDraft"("workspaceId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationDelivery_handoffDraftId_key" ON "IntegrationDelivery"("handoffDraftId");

-- CreateIndex
CREATE INDEX "IntegrationDelivery_status_idx" ON "IntegrationDelivery"("status");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionMapVersion" ADD CONSTRAINT "VisionMapVersion_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefExport" ADD CONSTRAINT "BriefExport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SddExport" ADD CONSTRAINT "SddExport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoffDraft" ADD CONSTRAINT "HandoffDraft_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationDelivery" ADD CONSTRAINT "IntegrationDelivery_handoffDraftId_fkey" FOREIGN KEY ("handoffDraftId") REFERENCES "HandoffDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

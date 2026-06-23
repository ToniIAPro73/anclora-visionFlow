-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterEnum
ALTER TYPE "EvidenceKind" ADD VALUE 'filestudio_manifest';

-- CreateTable: CatalogEmbedding (pgvector)
CREATE TABLE "CatalogEmbedding" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "chunk" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CaseMetric
CREATE TABLE "CaseMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "reachedApproved" BOOLEAN NOT NULL DEFAULT false,
    "handedOff" BOOLEAN NOT NULL DEFAULT false,
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseMetric_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "CaseMetric_caseId_key" ON "CaseMetric"("caseId");

-- CreateIndex
CREATE INDEX "CatalogEmbedding_sourceType_idx" ON "CatalogEmbedding"("sourceType");

-- CreateIndex
CREATE INDEX "CatalogEmbedding_sourceId_idx" ON "CatalogEmbedding"("sourceId");

-- Create IVFFlat similarity index for cosine search
-- (requires at least 1 row to build; use HNSW as fallback for small datasets)
CREATE INDEX IF NOT EXISTS "CatalogEmbedding_embedding_idx" ON "CatalogEmbedding" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- CreateIndex
CREATE INDEX "CaseMetric_workspaceId_templateSlug_idx" ON "CaseMetric"("workspaceId", "templateSlug");

-- CreateIndex
CREATE INDEX "CaseMetric_workspaceId_idx" ON "CaseMetric"("workspaceId");

-- AddForeignKey
ALTER TABLE "CaseMetric" ADD CONSTRAINT "CaseMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

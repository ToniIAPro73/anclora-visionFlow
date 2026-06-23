import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { transition } from "@/lib/case-lifecycle";
import type { CreateCaseInput } from "@/lib/schemas/case";
import { getTemplate } from "@/lib/case-templates";
import type { CaseStatus } from "@prisma/client";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";

export async function createCase(input: CreateCaseInput, actorId: string) {
  const template = getTemplate(input.templateSlug);
  if (!template) throw new Error(`Template not found: ${input.templateSlug}`);

  const workspaceId = CANONICAL_WORKSPACE_ID;

  const newCase = await db.case.create({
    data: {
      workspaceId,
      type: input.type,
      templateSlug: input.templateSlug,
      title: input.title,
      brief: input.brief,
      paletteId: template.paletteId,
      createdById: actorId,
      status: "draft",
    },
  });

  // Create initial VisionMapVersion with prefilled nodes from template
  await db.visionMapVersion.create({
    data: {
      caseId: newCase.id,
      version: 1,
      map: { nodes: template.prefilledNodes, connections: [] },
    },
  });

  await recordAudit({
    workspaceId,
    actorId,
    action: "generation",
    resourceType: "Case",
    resourceId: newCase.id,
    metadata: { templateSlug: input.templateSlug, type: input.type },
  });

  return newCase;
}

export async function transitionCase(
  caseId: string,
  to: CaseStatus,
  actorId: string,
  role: string,
  motivo?: string
) {
  const existing = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  // Cast to the string-based ProposalStatus used by case-lifecycle
  const newStatus = transition(
    existing.status as Parameters<typeof transition>[0],
    to as Parameters<typeof transition>[1],
    role,
    motivo
  ) as CaseStatus;

  const updated = await db.case.update({
    where: { id: caseId },
    data: {
      status: newStatus,
      reviewedById: newStatus === "review" ? actorId : undefined,
      approvedById: newStatus === "approved" ? actorId : undefined,
    },
  });

  await recordAudit({
    workspaceId: existing.workspaceId,
    actorId,
    action: "status_change",
    resourceType: "Case",
    resourceId: caseId,
    reason: motivo,
    metadata: { from: existing.status, to: newStatus },
  });

  return updated;
}

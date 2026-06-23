import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { ContentBriefSchema } from "@/lib/schemas/activation";
import type { ContentBrief } from "@/lib/schemas/activation";
import { sanitizeCatalogContent } from "@/lib/sanitize";

export async function buildBriefExport(
  caseId: string,
  workspaceId: string,
  actorId: string
): Promise<ContentBrief> {
  const c = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: { evidences: { where: { reviewState: "approved" } } },
  });

  const brief = c.brief as Record<string, unknown>;
  const allowedEvidence = c.evidences
    .filter((e) => e.sensitivity !== "restricted")
    .map((e) => e.externalRef);

  const payload: ContentBrief = {
    contractVersion: "content-brief-v1",
    caseId,
    audience: sanitizeCatalogContent(
      String(
        (brief.proximoPaso as Record<string, unknown>)?.responsable ??
          "Equipo comercial"
      )
    ),
    valueProposition: sanitizeCatalogContent(String(brief.objetivo ?? "")),
    allowedEvidence,
    objections: [],
    prohibitedClaims: [
      "garantía de rentabilidad",
      "certificado oficial",
      "precio exacto garantizado",
    ],
    tone: "profesional",
    language: "es",
    cta: sanitizeCatalogContent(
      String(
        (brief.proximoPaso as Record<string, unknown>)?.accion ?? ""
      )
    ),
    channels: ["email", "linkedin"],
  };

  const validated = ContentBriefSchema.parse(payload);

  await db.briefExport.create({
    data: { caseId, workspaceId, payload: validated, createdById: actorId },
  });

  await recordAudit({
    workspaceId,
    actorId,
    action: "export",
    resourceType: "BriefExport",
    resourceId: caseId,
  });

  return validated;
}

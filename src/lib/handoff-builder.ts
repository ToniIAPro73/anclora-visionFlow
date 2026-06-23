import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { sanitizeCatalogContent } from "@/lib/sanitize";
import { HandoffPayloadSchema } from "@/lib/schemas/handoff";
import type { HandoffPayload } from "@/lib/schemas/handoff";
import type { CaseType } from "@prisma/client";

const TYPE_MAP: Record<CaseType, HandoffPayload["initiativeType"]> = {
  captacion_premium: "captacion_premium",
  comercializacion_activo: "comercializacion_activo",
  contexto_energetico: "contexto_energetico",
  campana_territorial: "campana_territorial",
  propuesta_partner: "propuesta_partner",
};

export async function buildHandoffPayload(caseId: string): Promise<HandoffPayload> {
  const c = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: { evidences: { where: { reviewState: "approved" } } },
  });

  if (c.status !== "approved") {
    throw new Error("Only approved cases can be handed off");
  }

  const brief = c.brief as Record<string, unknown>;

  const evidenceRefs = c.evidences
    .filter((e) => e.sensitivity !== "restricted")
    .map((e) => ({
      source: e.source,
      externalRef: e.externalRef,
      sensitivity: e.sensitivity as HandoffPayload["evidenceReferences"][number]["sensitivity"],
      issuedAt: e.issuedAt?.toISOString(),
      expiresAt: e.expiresAt?.toISOString(),
    }));

  const proxPaso = brief.proximoPaso as Record<string, unknown> | undefined;

  const payload: HandoffPayload = {
    contractVersion: "visionflow-case-handoff-v1",
    caseId: c.id,
    workspaceId: c.workspaceId,
    orgId: process.env.NEXUS_ORG_ID ?? "anclora-internal",
    initiativeType: TYPE_MAP[c.type],
    executiveSummary: sanitizeCatalogContent(String(brief.objetivo ?? "")).slice(0, 2000),
    suggestedActions: [
      {
        accion: sanitizeCatalogContent(
          String(proxPaso?.accion ?? "Revisar propuesta")
        ),
        responsable: sanitizeCatalogContent(
          String(proxPaso?.responsable ?? "Equipo comercial")
        ),
        prioridad: "alta",
      },
    ],
    evidenceReferences: evidenceRefs,
    risks: ((brief.riesgos as string[]) ?? []).map((r) => sanitizeCatalogContent(r)),
    owner: sanitizeCatalogContent(String(proxPaso?.responsable ?? "Equipo")),
    nextSteps: sanitizeCatalogContent(String(proxPaso?.accion ?? "Revisar")),
    idempotencyKey: randomUUID(),
    returnLink: `${process.env.NEXTAUTH_URL ?? "https://visionflow.anclora.com"}/cases/${caseId}`,
    generatedAt: new Date().toISOString(),
  };

  return HandoffPayloadSchema.parse(payload);
}

import { z } from "zod";

export const SuggestedActionSchema = z.object({
  accion: z.string().min(5),
  responsable: z.string().min(2),
  prioridad: z.enum(["alta", "media", "baja"]).default("media"),
});

export const EvidenceRefSchema = z.object({
  source: z.string(),
  externalRef: z.string(),
  sensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const HandoffPayloadSchema = z.object({
  contractVersion: z.literal("visionflow-case-handoff-v1"),
  caseId: z.string(),
  workspaceId: z.string(),
  orgId: z.string(),
  initiativeType: z.enum([
    "captacion_premium",
    "comercializacion_activo",
    "contexto_energetico",
    "campana_territorial",
    "propuesta_partner",
  ]),
  executiveSummary: z.string().min(20).max(2000),
  suggestedActions: z.array(SuggestedActionSchema).min(1),
  evidenceReferences: z.array(EvidenceRefSchema).default([]),
  risks: z.array(z.string()).default([]),
  owner: z.string().min(2),
  nextSteps: z.string().min(5),
  idempotencyKey: z.string().uuid(),
  returnLink: z.string().url(),
  generatedAt: z.string().datetime(),
});
export type HandoffPayload = z.infer<typeof HandoffPayloadSchema>;

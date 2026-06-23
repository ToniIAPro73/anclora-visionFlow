import { z } from "zod";

export const CaseBriefSchema = z.object({
  objetivo: z.string().min(10).max(500),
  supuestos: z.array(z.string().min(3)).min(1),
  riesgos: z.array(z.string().min(3)).min(1),
  evidenciaDisponible: z.array(z.string()).default([]),
  evidenciaPendiente: z.array(z.string()).default([]),
  appsImplicadas: z.array(z.string()).min(1),
  kpis: z
    .array(
      z.object({
        nombre: z.string().min(2),
        target: z.string().optional(),
        unidad: z.string().optional(),
      })
    )
    .min(1),
  proximoPaso: z.object({
    accion: z.string().min(5),
    responsable: z.string().min(2),
  }),
  sensibilidad: z
    .enum(["public", "internal", "confidential", "restricted"])
    .default("internal"),
});
export type CaseBrief = z.infer<typeof CaseBriefSchema>;

export const CaseTypeSchema = z.enum([
  "captacion_premium",
  "comercializacion_activo",
  "contexto_energetico",
  "campana_territorial",
  "propuesta_partner",
]);

export const CreateCaseSchema = z.object({
  type: CaseTypeSchema,
  templateSlug: z.string(),
  title: z.string().min(4).max(120),
  brief: CaseBriefSchema,
});
export type CreateCaseInput = z.infer<typeof CreateCaseSchema>;

export const TransitionSchema = z.object({
  to: z.enum(["review", "approved", "handed_off", "archived"]),
  motivo: z.string().min(3).optional(),
});

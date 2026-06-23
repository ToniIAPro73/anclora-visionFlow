import { z } from "zod";

export const InsightCardSchema = z.object({
  cardId: z.string().min(1),
  title: z.string().min(3).max(200),
  summary: z.string().min(10).max(2000),
  version: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  source: z.string().default("data-lab"),
  indicators: z
    .array(
      z.object({
        nombre: z.string().min(2),
        valor: z.union([z.string(), z.number()]),
        unidad: z.string().optional(),
      })
    )
    .default([]),
});
export type InsightCard = z.infer<typeof InsightCardSchema>;

export const EnergyReferenceSchema = z.object({
  assessmentId: z.string().min(1),
  propertyRef: z.string().min(1),
  scenarioId: z.string().min(1),
  calificacion: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
  kwhYear: z.number().positive(),
  co2KgYear: z.number().nonnegative(),
  limitations: z.array(z.string()).default([]),
  issuedAt: z.string().datetime(),
});
export type EnergyReference = z.infer<typeof EnergyReferenceSchema>;

export const ContentBriefSchema = z.object({
  contractVersion: z.literal("content-brief-v1"),
  caseId: z.string().min(1),
  audience: z.string().min(2).max(200),
  valueProposition: z.string().min(10).max(1000),
  allowedEvidence: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  prohibitedClaims: z.array(z.string()).default([]),
  tone: z.enum(["profesional", "cercano", "tecnico", "premium"]).default("profesional"),
  language: z.string().default("es"),
  cta: z.string().min(5).max(200),
  channels: z.array(z.string()).min(1),
});
export type ContentBrief = z.infer<typeof ContentBriefSchema>;

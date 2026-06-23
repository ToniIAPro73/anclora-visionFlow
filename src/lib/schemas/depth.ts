import { z } from "zod";

export const FileManifestSchema = z.object({
  contractVersion: z.literal("filestudio-manifest-v1"),
  manifestId: z.string().min(1),
  sha256: z.string().length(64),
  mimeType: z.string().min(1),
  classification: z.enum(["public", "internal", "confidential", "restricted"]),
  ocrAvailable: z.boolean(),
  permittedExtract: z.string().max(2000).optional(),
  exifStripped: z.boolean(),
  pages: z.number().int().positive().optional(),
  issuedAt: z.string().datetime(),
});
export type FileManifest = z.infer<typeof FileManifestSchema>;

export const RagChunkSchema = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  chunk: z.string().min(1).max(4000),
  similarity: z.number().min(0).max(1),
});
export type RagChunk = z.infer<typeof RagChunkSchema>;

export const RagQuerySchema = z.object({
  query: z.string().min(3).max(500),
  limit: z.number().int().min(1).max(10).default(5),
  excludeRestricted: z.boolean().default(true),
});
export type RagQuery = z.infer<typeof RagQuerySchema>;

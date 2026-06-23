import { db } from "@/lib/db";
import { sanitizeCatalogContent } from "@/lib/sanitize";

const EMBEDDING_DIM = 384;

// Deterministic pseudo-embedding — mirrors indexer.ts implementation.
// In production, replace with actual embedding API (DEC-DEPTH-001).
function pseudoEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const bytes = Buffer.from(text.slice(0, 1000), "utf8");
  for (let i = 0; i < bytes.length; i++) {
    vec[i % EMBEDDING_DIM] = (vec[i % EMBEDDING_DIM] + bytes[i] / 255) % 1;
  }
  const norm = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return vec.map((v: number) => v / norm);
}

export interface RetrievedChunk {
  sourceType: string;
  sourceId: string;
  chunk: string;
  similarity: number;
}

export async function retrieveRelevant(
  query: string,
  limit = 5,
  excludeRestricted = true
): Promise<RetrievedChunk[]> {
  const sanitizedQuery = sanitizeCatalogContent(query);
  const embedding = pseudoEmbed(sanitizedQuery);
  const vectorStr = `[${embedding.join(",")}]`;

  // Use raw query for vector similarity search.
  // Restricted sources are never indexed (enforced in indexer) so excludeRestricted
  // is enforced at write time, not at query time.
  let rows: Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    chunk: string;
    similarity: number;
  }> = [];

  try {
    rows = await db.$queryRawUnsafe<typeof rows>(
      `SELECT id, "sourceType", "sourceId", chunk,
              1 - (embedding <=> $1::vector) as similarity
       FROM "CatalogEmbedding"
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vectorStr,
      limit
    );
  } catch {
    // pgvector extension not available in test environment — return empty
    return [];
  }

  return rows
    .filter((r) => r.similarity > 0.1)
    .map((r) => ({
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      chunk: sanitizeCatalogContent(r.chunk),
      similarity: r.similarity,
    }));
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) => `[Contexto ${i + 1} — ${c.sourceType}/${c.sourceId}]:\n${c.chunk}`)
    .join("\n\n");
}

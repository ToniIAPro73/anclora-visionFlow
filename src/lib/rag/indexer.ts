import { db } from "@/lib/db";
import { sanitizeCatalogContent } from "@/lib/sanitize";
import { recordAudit } from "@/lib/audit";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";

const EMBEDDING_DIM = 384;

// Simple deterministic pseudo-embedding for development without an embedding API.
// In production, replace with actual embedding API (e.g. local sentence-transformers via API).
// Decision: DEC-DEPTH-001
function pseudoEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const bytes = Buffer.from(text.slice(0, 1000), "utf8");
  for (let i = 0; i < bytes.length; i++) {
    vec[i % EMBEDDING_DIM] = (vec[i % EMBEDDING_DIM] + bytes[i] / 255) % 1;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return vec.map((v: number) => v / norm);
}

function chunkText(text: string, maxChars = 800): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";
  for (const p of paragraphs) {
    if ((current + p).length > maxChars && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 20);
}

export async function indexCatalogApps(actorId: string): Promise<number> {
  const apps = await db.ancloraAppRecord.findMany({
    where: { catalogState: "publicado" },
    select: { id: true, slug: true, name: true, description: true, tagline: true, updatedAt: true },
  });

  let indexed = 0;
  for (const app of apps) {
    const version = app.updatedAt.toISOString();
    const existing = await db.catalogEmbedding.findFirst({
      where: { sourceType: "catalog_app", sourceId: app.id, sourceVersion: version },
    });
    if (existing) continue;

    const text = sanitizeCatalogContent(`${app.name}\n${app.tagline}\n${app.description}`);
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const embedding = pseudoEmbed(chunk);
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO "CatalogEmbedding" (id, "sourceType", "sourceId", "sourceVersion", chunk, embedding, "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, NOW())`,
          "catalog_app",
          app.id,
          version,
          chunk,
          `[${embedding.join(",")}]`
        );
        indexed++;
      } catch {
        // pgvector extension not available in this environment — skip silently
      }
    }
  }

  if (indexed > 0) {
    await recordAudit({
      workspaceId: CANONICAL_WORKSPACE_ID,
      actorId,
      action: "generation",
      resourceType: "CatalogEmbedding",
      resourceId: "batch",
      metadata: { indexed, sourceType: "catalog_app" },
    });
  }

  return indexed;
}

export async function indexRealEstateSpecs(actorId: string): Promise<number> {
  // Index approved case templates as specs
  const { CASE_TEMPLATES } = await import("@/lib/case-templates");
  let indexed = 0;

  for (const template of CASE_TEMPLATES) {
    const version = "v1";
    const existing = await db.catalogEmbedding.findFirst({
      where: { sourceType: "realestate_spec", sourceId: template.slug, sourceVersion: version },
    });
    if (existing) continue;

    const text = sanitizeCatalogContent(
      `Plantilla: ${template.name}\n${template.description}\nApps: ${template.appsImplicadas.join(", ")}\nKPIs: ${template.kpiCatalog.map((k: { nombre: string }) => k.nombre).join(", ")}`
    );
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const embedding = pseudoEmbed(chunk);
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO "CatalogEmbedding" (id, "sourceType", "sourceId", "sourceVersion", chunk, embedding, "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, NOW())`,
          "realestate_spec",
          template.slug,
          version,
          chunk,
          `[${embedding.join(",")}]`
        );
        indexed++;
      } catch {
        // pgvector extension not available in this environment — skip silently
      }
    }
  }

  return indexed;
}

export async function reindexAll(actorId: string): Promise<{ total: number }> {
  const [apps, specs] = await Promise.all([
    indexCatalogApps(actorId),
    indexRealEstateSpecs(actorId),
  ]);
  return { total: apps + specs };
}

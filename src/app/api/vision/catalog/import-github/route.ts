import { NextRequest, NextResponse } from "next/server";
import { importFromGithub, upsertCatalogApp } from "@/lib/anclora-catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/vision/catalog/import-github
// Body: { url: string }  or  { urls: string[] }  for batch
// Returns: { imported: [...], errors: [...] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const urls: string[] = (() => {
      if (Array.isArray(body.urls)) return body.urls;
      if (typeof body.url === "string") return [body.url];
      return [];
    })();

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "Se requiere 'url' o 'urls'." },
        { status: 400 }
      );
    }

    const imported: Array<{ slug: string; name: string; tagline: string; family: string; repoUrl: string }> = [];
    const errors: string[] = [];

    for (const url of urls) {
      const result = await importFromGithub(url);
      if (!result.ok || !result.app) {
        errors.push(`${url}: ${result.error || "Error desconocido"}`);
        continue;
      }
      try {
        await upsertCatalogApp(result.app, "github-import", result.repoUrl);
        imported.push({
          slug: result.app.slug,
          name: result.app.name,
          tagline: result.app.tagline,
          family: result.app.family,
          repoUrl: result.repoUrl || "",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al guardar";
        errors.push(`${url}: ${msg}`);
      }
    }

    return NextResponse.json({ ok: true, imported, errors });
  } catch (err) {
    console.error("import-github error:", err);
    return NextResponse.json(
      { error: "No se pudo importar desde GitHub." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { parseRepoTxt, upsertCatalogApp, type ParsedApp } from "@/lib/anclora-catalog";

export const runtime = "nodejs";
export const maxDuration = 30;
// Allow large .txt uploads (up to ~15MB)
export const fetchCache = "force-no-store";

// POST /api/vision/catalog/import-txt
// Body: { files: [{ filename, content }] }  — multiple files supported
// Returns: { imported: ParsedApp[], errors: string[] }
export async function POST(req: NextRequest) {
  try {
    // Read the raw body as text first to avoid JSON parse issues with very large payloads
    const rawText = await req.text();
    // Limit to 15MB to avoid OOM
    if (rawText.length > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Payload demasiado grande (máx 15MB)." },
        { status: 413 }
      );
    }
    let body: { files?: Array<{ filename: string; content: string }> };
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "JSON inválido en el body." },
        { status: 400 }
      );
    }
    const files = body.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un archivo en 'files'." },
        { status: 400 }
      );
    }

    const imported: ParsedApp[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Find the "# Anclora" heading position and parse from there.
        // The .txt dumps include a long directory tree at the top (~100KB+)
        // that we don't need — the README content starts at the heading.
        const headingIdx = file.content.search(/^#\s+Anclora\s/m);
        const readmeContent =
          headingIdx >= 0
            ? file.content.slice(headingIdx, headingIdx + 50_000)
            : file.content.slice(0, 50_000);
        const parsed = parseRepoTxt(file.filename, readmeContent);
        if (!parsed) {
          errors.push(`${file.filename}: no se encontró encabezado "# Anclora <Name>"`);
          continue;
        }
        await upsertCatalogApp(parsed, "txt-import");
        imported.push(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        errors.push(`${file.filename}: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      imported: imported.map((a) => ({
        slug: a.slug,
        name: a.name,
        tagline: a.tagline,
        family: a.family,
        capabilitiesCount: a.capabilities.length,
        stackCount: a.stack.length,
      })),
      errors,
    });
  } catch (err) {
    console.error("import-txt error:", err);
    return NextResponse.json(
      { error: "No se pudo procesar la importación." },
      { status: 500 }
    );
  }
}

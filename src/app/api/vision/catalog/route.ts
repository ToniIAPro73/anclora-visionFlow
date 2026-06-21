import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatalogApps, updateCatalogAppFields } from "@/lib/anclora-catalog";

const UpdateCatalogAppSchema = z.object({
  id: z.string().min(1),
  fields: z.object({
    name: z.string().min(1).max(200).optional(),
    family: z.enum(["Premium", "Internal", "Tool", "Platform"]).optional(),
    tagline: z.string().max(300).optional(),
    description: z.string().max(2000).optional(),
    stackJson: z.string().optional(),
    capabilitiesJson: z.string().optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    domain: z.string().max(200).optional(),
    githubUrl: z.string().url().optional().nullable(),
  }),
});

export const runtime = "nodejs";

// GET /api/vision/catalog — list all apps (DB + defaults)
export async function GET() {
  try {
    const apps = await getCatalogApps();
    return NextResponse.json({ apps });
  } catch (err) {
    console.error("catalog list error:", err);
    return NextResponse.json({ error: "No se pudo listar el catálogo." }, { status: 500 });
  }
}

// POST /api/vision/catalog — update an existing app's editable fields
// Body: { id, fields: {...} }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = UpdateCatalogAppSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos de la app inválidos." },
        { status: 400 }
      );
    }
    const { id, fields } = parseResult.data;
    const updated = await updateCatalogAppFields(id, fields as Record<string, unknown>);
    return NextResponse.json({ ok: true, app: updated });
  } catch (err) {
    console.error("catalog update error:", err);
    return NextResponse.json({ error: "No se pudo actualizar la app." }, { status: 500 });
  }
}

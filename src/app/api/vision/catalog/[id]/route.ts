import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteCatalogApp, updateCatalogAppFields } from "@/lib/anclora-catalog";

const UpdateAppSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  family: z.enum(["Premium", "Internal", "Tool", "Platform"]).optional(),
  tagline: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
  stackJson: z.string().optional(),
  capabilitiesJson: z.string().optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  domain: z.string().max(200).optional(),
  githubUrl: z.string().url().optional().nullable(),
});

export const runtime = "nodejs";

// PATCH /api/vision/catalog/[id] — update an app's editable fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parseResult = UpdateAppSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos de actualización de la app inválidos." },
        { status: 400 }
      );
    }
    const fields = parseResult.data;
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }
    const updated = await updateCatalogAppFields(id, fields as Record<string, unknown>);
    return NextResponse.json({ ok: true, app: updated });
  } catch (err) {
    console.error("catalog patch error:", err);
    return NextResponse.json({ error: "No se pudo actualizar la app." }, { status: 500 });
  }
}

// DELETE /api/vision/catalog/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteCatalogApp(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("catalog delete error:", err);
    return NextResponse.json({ error: "No se pudo eliminar la app." }, { status: 500 });
  }
}

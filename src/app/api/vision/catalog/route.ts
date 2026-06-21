import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatalogApps, updateCatalogAppFields } from "@/lib/anclora-catalog";

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
    const { id, fields } = body as { id?: string; fields?: Record<string, unknown> };
    if (!id || !fields) {
      return NextResponse.json({ error: "Se requiere id y fields." }, { status: 400 });
    }
    const updated = await updateCatalogAppFields(id, fields);
    return NextResponse.json({ ok: true, app: updated });
  } catch (err) {
    console.error("catalog update error:", err);
    return NextResponse.json({ error: "No se pudo actualizar la app." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { deleteCatalogApp } from "@/lib/anclora-catalog";

export const runtime = "nodejs";

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

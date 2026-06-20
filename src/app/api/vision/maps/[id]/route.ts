import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VisionMap } from "@/lib/vision-map";

export const runtime = "nodejs";

// GET /api/vision/maps/[id] — load a single map
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const r = await db.visionMapRecord.findUnique({ where: { id } });
    if (!r) {
      return NextResponse.json({ error: "Mapa no encontrado" }, { status: 404 });
    }
    const map: VisionMap = {
      idea: r.idea,
      summary: r.summary,
      nodes: safeParseArr(r.nodesJson) as VisionMap["nodes"],
      connections: safeParseArr(r.connectionsJson) as VisionMap["connections"],
      apps: safeParseArr(r.appsJson) as string[],
      generatedAt: r.createdAt.toISOString(),
      palette: (r.palette as VisionMap["palette"]) || "anclora",
    };
    return NextResponse.json({
      id: r.id,
      title: r.title,
      tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
      starred: r.starred,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      map,
    });
  } catch (err) {
    console.error("load map error:", err);
    return NextResponse.json({ error: "No se pudo cargar el mapa." }, { status: 500 });
  }
}

// DELETE /api/vision/maps/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.visionMapRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete map error:", err);
    return NextResponse.json({ error: "No se pudo eliminar el mapa." }, { status: 500 });
  }
}

function safeParseArr(s: string | null | undefined): unknown[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

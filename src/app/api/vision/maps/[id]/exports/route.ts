import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveServerWorkspaceId } from "@/lib/workspace-context";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = resolveServerWorkspaceId();

    // Verify map exists and belongs to workspace
    const map = await db.visionMapRecord.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!map) {
      return NextResponse.json(
        { error: "Mapa no encontrado" },
        { status: 404 }
      );
    }

    // Get all exports for this map, ordered by most recent first
    const exports = await db.mapExport.findMany({
      where: { mapId: id },
      select: {
        id: true,
        format: true,
        blobUrl: true,
        fileSize: true,
        uploadedAt: true,
        expiresAt: true,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ exports });
  } catch (err) {
    console.error("list exports error:", err);
    return NextResponse.json(
      { error: "Error al listar archivos" },
      { status: 500 }
    );
  }
}

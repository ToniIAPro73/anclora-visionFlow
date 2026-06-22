import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { resolveServerWorkspaceId } from "@/lib/workspace-context";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; exportId: string }> }
) {
  try {
    const { id, exportId } = await params;
    const workspaceId = resolveServerWorkspaceId();

    // Verify export belongs to map and user has access to workspace
    const mapExport = await db.mapExport.findFirst({
      where: {
        id: exportId,
        mapId: id,
        visionMap: { workspaceId },
      },
      select: {
        id: true,
        blobHash: true,
        blobUrl: true,
      },
    });

    if (!mapExport) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    // Delete blob from Vercel
    try {
      await del(mapExport.blobUrl);
    } catch (blobError) {
      console.error("Blob deletion error (non-critical):", blobError);
      // Continue even if blob deletion fails - we'll still remove the DB record
    }

    // Delete database record
    await db.mapExport.delete({
      where: { id: exportId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete export error:", err);
    return NextResponse.json(
      { error: "Error al eliminar archivo" },
      { status: 500 }
    );
  }
}

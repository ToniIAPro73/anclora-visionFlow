import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { resolveServerWorkspaceId } from "@/lib/workspace-context";

export const runtime = "nodejs";

// Hard cap: blobs older than 24 h require re-export (expiry field added in Fase 2)
const EXPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; exportId: string }> }
) {
  try {
    const { id, exportId } = await params;
    const workspaceId = resolveServerWorkspaceId();

    // Verify export belongs to map and workspace before serving
    const mapExport = await db.mapExport.findFirst({
      where: {
        id: exportId,
        mapId: id,
        visionMap: { workspaceId },
      },
      select: {
        blobUrl: true,
        format: true,
        uploadedAt: true,
      },
    });

    if (!mapExport) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    const age = Date.now() - mapExport.uploadedAt.getTime();
    if (age > EXPORT_MAX_AGE_MS) {
      return NextResponse.json(
        { error: "El enlace de descarga ha expirado" },
        { status: 410 }
      );
    }

    // Proxy private blob server-side — BLOB_READ_WRITE_TOKEN used automatically by SDK
    const blobResponse = await get(mapExport.blobUrl, { access: "private" });
    if (!blobResponse || blobResponse.statusCode !== 200 || !blobResponse.stream) {
      return NextResponse.json(
        { error: "Blob no disponible" },
        { status: 502 }
      );
    }

    const mimeType =
      mapExport.format === "pdf" ? "application/pdf" : "image/png";

    return new NextResponse(blobResponse.stream, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="export-${exportId}.${mapExport.format}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("download export error:", err);
    return NextResponse.json(
      { error: "Error al descargar archivo" },
      { status: 500 }
    );
  }
}

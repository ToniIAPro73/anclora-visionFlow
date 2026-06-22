import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveServerWorkspaceId } from "@/lib/workspace-context";

export const runtime = "nodejs";

export async function GET(
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
        blobUrl: true,
        format: true,
        fileSize: true,
        uploadedAt: true,
      },
    });

    if (!mapExport) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    // Check if export has expired (optional)
    // Future: add expiration logic here

    // Redirect to blob URL or fetch and stream
    // For simplicity, we redirect to the Vercel Blob public URL
    // which is more efficient than proxying through our server
    return NextResponse.redirect(mapExport.blobUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    // Alternative: proxy the download with custom headers
    // const response = await fetch(mapExport.blobUrl);
    // const mimeType = mapExport.format === "pdf" ? "application/pdf" : "image/png";
    // return new NextResponse(response.body, {
    //   status: 200,
    //   headers: {
    //     "Content-Type": mimeType,
    //     "Content-Disposition": `attachment; filename="map-${Date.now()}.${mapExport.format}"`,
    //     "Cache-Control": "public, max-age=31536000",
    //   },
    // });
  } catch (err) {
    console.error("download export error:", err);
    return NextResponse.json(
      { error: "Error al descargar archivo" },
      { status: 500 }
    );
  }
}

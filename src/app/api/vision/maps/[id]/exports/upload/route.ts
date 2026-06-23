import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { resolveServerWorkspaceId } from "@/lib/workspace-context";
import {
  checkUploadRateLimit,
  getUploadRateLimitConfig,
  getUploadRateLimitKey,
} from "@/lib/upload-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FORMATS = ["png", "pdf"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = resolveServerWorkspaceId();

    // Verify map exists and belongs to workspace
    const map = await db.visionMapRecord.findFirst({
      where: { id, workspaceId },
      select: { id: true, title: true },
    });

    if (!map) {
      return NextResponse.json(
        { error: "Mapa no encontrado" },
        { status: 404 }
      );
    }

    // Check rate limit
    const rateLimitKey = getUploadRateLimitKey(id, workspaceId);
    const rateLimitConfig = getUploadRateLimitConfig();
    const rateLimit = checkUploadRateLimit(rateLimitKey, rateLimitConfig);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Has excedido el límite de subidas. Intenta más tarde.",
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const format = formData.get("format") as string | null;

    if (!file || !format) {
      return NextResponse.json(
        { error: "Archivo y formato son requeridos" },
        { status: 400 }
      );
    }

    // Validate format
    if (!ALLOWED_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Formato no permitido. Usa: ${ALLOWED_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Archivo muy grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
    }

    // Validate MIME type
    const expectedMimeTypes: Record<string, string[]> = {
      png: ["image/png"],
      pdf: ["application/pdf"],
    };

    if (!expectedMimeTypes[format].includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo inválido para formato ${format}` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blobs
    const filename = `map-${id}-${Date.now()}.${format}`;
    const arrayBuffer = await file.arrayBuffer();

    let blobUrl: string;
    let blobHash: string;

    try {
      const blob = await put(filename, Buffer.from(arrayBuffer), {
        access: "private",
        contentType: file.type,
      });

      blobUrl = blob.url;
      // Extract hash from URL or use as identifier
      blobHash = blob.pathname || filename;
    } catch (blobError) {
      console.error("Blob upload error:", blobError);
      return NextResponse.json(
        { error: "Error al subir archivo. Intenta de nuevo." },
        { status: 502 }
      );
    }

    // Record in database
    try {
      const mapExport = await db.mapExport.create({
        data: {
          mapId: id,
          format,
          blobUrl,
          blobHash,
          fileSize: file.size,
        },
      });

      return NextResponse.json({
        id: mapExport.id,
        url: blobUrl,
        format: mapExport.format,
        fileSize: mapExport.fileSize,
        uploadedAt: mapExport.uploadedAt,
      });
    } catch (dbError) {
      // Clean up blob if DB insert fails
      console.error("Database insert error:", dbError);

      // Try to delete blob
      try {
        const { del } = await import("@vercel/blob");
        await del(blobUrl);
      } catch (_) {
        // Blob cleanup failure is non-critical
      }

      return NextResponse.json(
        { error: "Error al guardar información del archivo" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("upload endpoint error:", err);
    return NextResponse.json(
      { error: "Error al procesar la subida" },
      { status: 500 }
    );
  }
}

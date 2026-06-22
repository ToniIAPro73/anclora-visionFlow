import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveServerWorkspaceId } from "@/lib/workspace-context";
import type { VisionMap } from "@/lib/vision-map";

// Vision map management endpoints with workspace isolation

const UpdateMapSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  summary: z.string().max(1000).optional(),
  nodesJson: z.string().min(2).optional(),
  connectionsJson: z.string().optional(),
  appsJson: z.string().optional(),
  palette: z.enum(["anclora", "nexus", "premium"]).optional(),
  tags: z.string().max(500).optional(),
  starred: z.boolean().optional(),
});

export const runtime = "nodejs";

// GET /api/vision/maps/[id] — load a single map
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = resolveServerWorkspaceId();
    const r = await db.visionMapRecord.findFirst({
      where: { id },
    });
    if (!r) {
      return NextResponse.json({ error: "Mapa no encontrado" }, { status: 404 });
    }
    // Workspace isolation check
    if (r.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const map: VisionMap = {
      idea: r.idea,
      summary: r.summary,
      nodes: safeParseArr(r.nodesJson) as VisionMap["nodes"],
      connections: safeParseArr(r.connectionsJson) as VisionMap["connections"],
      apps: safeParseArr(r.appsJson) as string[],
      generatedAt: r.createdAt.toISOString(),
      palette: (r.palette as VisionMap["palette"]) || "anclora",
      promptVersion: r.promptVersion ?? undefined,
      llmModel: r.llmModel ?? undefined,
      tokensUsed: r.tokensUsed ?? null,
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

// PATCH /api/vision/maps/[id] — update map fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = resolveServerWorkspaceId();
    const body = await req.json().catch(() => ({}));
    const parseResult = UpdateMapSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos de actualización inválidos." },
        { status: 400 }
      );
    }
    const data = parseResult.data;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }
    const existing = await db.visionMapRecord.findFirst({
      where: { id },
      select: { workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Mapa no encontrado" }, { status: 404 });
    }
    if (existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const updated = await db.visionMapRecord.update({
      where: { id },
      data,
    });
    return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt });
  } catch (err) {
    console.error("patch map error:", err);
    return NextResponse.json({ error: "No se pudo actualizar el mapa." }, { status: 500 });
  }
}

// DELETE /api/vision/maps/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = resolveServerWorkspaceId();
    const existing = await db.visionMapRecord.findFirst({
      where: { id },
      select: { workspaceId: true },
    });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Mapa no encontrado" }, { status: 404 });
    }
    const result = await db.visionMapRecord.deleteMany({
      where: { id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Mapa no encontrado" }, { status: 404 });
    }
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

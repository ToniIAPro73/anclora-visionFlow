import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PROMPT_VERSION, llmModel as SERVER_LLM_MODEL } from "@/lib/llm-client";
import type { VisionMap } from "@/lib/vision-map";

const SaveMapSchema = z.object({
  id: z.string().optional(),
  map: z.record(z.string(), z.unknown()).optional(),
  title: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  starred: z.boolean().optional(),
  palette: z.enum(["anclora", "nexus", "premium"]).optional(),
});

export const runtime = "nodejs";

// GET /api/vision/maps — list saved maps
export async function GET() {
  try {
    const records = await db.visionMapRecord.findMany({
      orderBy: [{ starred: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    const maps = records.map((r) => ({
      id: r.id,
      title: r.title,
      idea: r.idea,
      summary: r.summary,
      palette: r.palette,
      tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
      starred: r.starred,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      appsCount: safeParseArr(r.appsJson).length,
      nodesCount: safeParseArr(r.nodesJson).length,
      promptVersion: r.promptVersion ?? null,
      llmModel: r.llmModel ?? null,
      tokensUsed: r.tokensUsed ?? null,
    }));
    return NextResponse.json({ maps });
  } catch (err) {
    console.error("list maps error:", err);
    return NextResponse.json(
      { error: "No se pudieron listar los mapas guardados." },
      { status: 500 }
    );
  }
}

// POST /api/vision/maps — create or update a saved map
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = SaveMapSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos del mapa inválidos." },
        { status: 400 }
      );
    }
    const { id, map: rawMap, title, tags, starred, palette } = parseResult.data;
    const map = rawMap as VisionMap | undefined;

    if (!map && !id) {
      return NextResponse.json(
        { error: "Se requiere un mapa o un id existente." },
        { status: 400 }
      );
    }

    // If only id is provided, update metadata (star/tags)
    if (!map && id) {
      const data: Record<string, unknown> = {};
      if (typeof starred === "boolean") data.starred = starred;
      if (Array.isArray(tags)) data.tags = tags.join(",");
      if (palette) data.palette = palette;
      if (title) data.title = title.slice(0, 200);
      if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
      }
      const updated = await db.visionMapRecord.update({
        where: { id },
        data,
      });
      return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt });
    }

    const m = map!;
    // Server-authoritative: promptVersion and llmModel are always set to server's known values.
    // Client-provided values are ignored to prevent forging traceability data (REQ-AI-002, REQ-AI-007).
    // tokensUsed is client-reported (server cannot re-verify post-generation) but must be a positive integer.
    const genMeta = {
      promptVersion: PROMPT_VERSION,
      llmModel: SERVER_LLM_MODEL,
      tokensUsed: typeof m.tokensUsed === "number" && m.tokensUsed > 0 ? m.tokensUsed : null,
    };
    const record = await db.visionMapRecord.upsert({
      where: { id: id || "new" },
      create: {
        title: (title || m.idea || "Mapa sin título").slice(0, 200),
        idea: m.idea,
        summary: m.summary || "",
        appsJson: JSON.stringify(m.apps || []),
        nodesJson: JSON.stringify(m.nodes || []),
        connectionsJson: JSON.stringify(m.connections || []),
        palette: palette || m.palette || "anclora",
        tags: Array.isArray(tags) ? tags.join(",") : "",
        starred: typeof starred === "boolean" ? starred : false,
        ...genMeta,
      },
      update: {
        title: (title || m.idea || "Mapa sin título").slice(0, 200),
        idea: m.idea,
        summary: m.summary || "",
        appsJson: JSON.stringify(m.apps || []),
        nodesJson: JSON.stringify(m.nodes || []),
        connectionsJson: JSON.stringify(m.connections || []),
        palette: palette || m.palette || "anclora",
        tags: Array.isArray(tags) ? tags.join(",") : "",
        ...(typeof starred === "boolean" ? { starred } : {}),
        ...genMeta,
      },
    });

    return NextResponse.json({
      id: record.id,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error("save map error:", err);
    return NextResponse.json(
      { error: "No se pudo guardar el mapa." },
      { status: 500 }
    );
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

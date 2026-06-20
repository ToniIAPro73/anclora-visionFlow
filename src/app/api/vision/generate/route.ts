import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import {
  ANCLORA_APPS,
  findRelevantApps,
  type AncloraApp,
} from "@/lib/anclora-ecosystem";
import type {
  NodeCategory,
  Priority,
  VisionMap,
  VisionNode,
} from "@/lib/vision-map";
import { autoConnect, layoutVisionMap } from "@/lib/vision-map";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RawNode {
  category: NodeCategory;
  title: string;
  description: string;
  bullets?: string[];
  cost?: number;
  priority?: Priority;
  appSlug?: string;
  time?: string;
  owner?: string;
}

interface LLMResponse {
  summary: string;
  appSlugs: string[];
  nodes: RawNode[];
}

function buildSystemPrompt(apps: AncloraApp[]): string {
  const appCatalog = apps
    .map(
      (a) =>
        `- ${a.name} (slug: ${a.slug}, familia: ${a.family}) — ${a.tagline}. Capacidades: ${a.capabilities.join(", ")}. Stack: ${a.stack.join(", ")}`
    )
    .join("\n");

  return `Eres el motor de inteligencia de AncloraVisionFlow, una aplicación del ecosistema Anclora Group que convierte ideas, proyectos o problemas en mapas visuales accionables.

Tu trabajo: a partir de la idea del usuario, generar un mapa visual completo con nodos de las siguientes categorías:

- "idea" (exactamente 1, núcleo del input del usuario, reescrito de forma clara y concisa)
- "objective" (3-5 objetivos medibles y alineados con la idea)
- "priority" (2-4 prioridades de alto nivel, con campo priority: "alta" | "media" | "baja")
- "step" (4-7 pasos ordenados de ejecución, con campo time opcional y owner opcional)
- "next" (2-4 próximos pasos accionables de corto plazo)
- "risk" (3-5 riesgos con bullets de mitigación)
- "tool" (3-6 herramientas — prioriza SIEMPRE apps del ecosistema Anclora cuando encajen, usa el slug exacto; puedes añadir herramientas externas solo si son imprescindibles)
- "cost" (2-4 partidas de coste con número en EUR en campo cost; mezcla one-shot y recurring)

REGLAS CRÍTICAS:
1. Responde SIEMPRE en español.
2. Los títulos deben ser cortos (máx 8 palabras) y concretos.
3. Las descripciones deben tener entre 15 y 35 palabras, accionables.
4. Usa los slugs exactos de las apps Anclora: ${ANCLORA_APPS.map((a) => a.slug).join(", ")}.
5. Solo incluye appSlug cuando la herramienta sea una app del catálogo.
6. El summary debe tener entre 40 y 80 palabras, en tono profesional, explicando el enfoque del mapa.
7. NO inventes apps Anclora que no existan en el catálogo.

CATÁLOGO DEL ECOSISTEMA ANCLORA:
${appCatalog}

FORMATO DE SALIDA: JSON válido, sin markdown, sin explicación, estrictamente:
{
  "summary": "string",
  "appSlugs": ["slug1", ...],
  "nodes": [
    { "category": "idea", "title": "...", "description": "..." },
    { "category": "objective", "title": "...", "description": "...", "bullets": ["kpi1", "kpi2"] },
    { "category": "priority", "title": "...", "description": "...", "priority": "alta" },
    { "category": "step", "title": "...", "description": "...", "time": "2 semanas", "owner": "Backend" },
    { "category": "next", "title": "...", "description": "..." },
    { "category": "risk", "title": "...", "description": "...", "bullets": ["mitigación 1", "mitigación 2"] },
    { "category": "tool", "title": "Anclora Nexus", "description": "...", "appSlug": "nexus" },
    { "category": "cost", "title": "...", "description": "...", "cost": 4500 }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const idea: string = (body.idea || "").toString().trim();

    if (!idea || idea.length < 3) {
      return NextResponse.json(
        { error: "Debes proporcionar una idea, proyecto o problema." },
        { status: 400 }
      );
    }

    // Determine relevant apps to enrich the prompt
    const relevantApps = findRelevantApps(idea);
    const appsForPrompt =
      relevantApps.length > 0
        ? [...new Set([...relevantApps, ...ANCLORA_APPS.slice(0, 4)])]
        : ANCLORA_APPS;

    const systemPrompt = buildSystemPrompt(appsForPrompt);

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Idea del usuario: """${idea}"""\n\nGenera el mapa visual completo siguiendo el formato JSON especificado.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2400,
    });

    const content = completion.choices?.[0]?.message?.content ?? "";

    // Extract JSON robustly
    let parsed: LLMResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("LLM JSON parse failed:", err, content.slice(0, 500));
      return NextResponse.json(
        {
          error: "No se pudo interpretar el mapa generado. Intenta reformular la idea.",
          raw: content.slice(0, 800),
        },
        { status: 502 }
      );
    }

    // Normalize and validate nodes
    const validCategories: NodeCategory[] = [
      "idea",
      "objective",
      "step",
      "risk",
      "tool",
      "cost",
      "priority",
      "next",
    ];

    const cleanNodes: RawNode[] = (parsed.nodes || [])
      .filter((n) => n && validCategories.includes(n.category))
      .map((n) => ({
        category: n.category,
        title: (n.title || "Sin título").slice(0, 120),
        description: (n.description || "").slice(0, 500),
        bullets: Array.isArray(n.bullets)
          ? n.bullets.slice(0, 6).map((b) => String(b).slice(0, 160))
          : undefined,
        cost: typeof n.cost === "number" ? n.cost : undefined,
        priority: ["alta", "media", "baja"].includes(n.priority as string)
          ? (n.priority as Priority)
          : undefined,
        appSlug: n.appSlug,
        time: n.time ? String(n.time).slice(0, 40) : undefined,
        owner: n.owner ? String(n.owner).slice(0, 40) : undefined,
      }));

    // Ensure exactly one idea node
    const ideaNodes = cleanNodes.filter((n) => n.category === "idea");
    let finalNodes = cleanNodes;
    if (ideaNodes.length === 0) {
      finalNodes = [
        {
          category: "idea" as NodeCategory,
          title: idea.slice(0, 80),
          description: idea.slice(0, 300),
        },
        ...cleanNodes,
      ];
    } else if (ideaNodes.length > 1) {
      finalNodes = [ideaNodes[0], ...cleanNodes.filter((n) => n.category !== "idea")];
    }

    // Assign ids
    const nodesWithIds: VisionNode[] = finalNodes.map((n, i) => ({
      ...n,
      id: `node-${i + 1}`,
      x: 0,
      y: 0,
    }));

    // Layout
    const laidOut = layoutVisionMap(nodesWithIds);

    // Connections
    const connections = autoConnect(laidOut);

    // Apps summary (deduplicated)
    const apps = Array.from(
      new Set(
        laidOut
          .filter((n) => n.appSlug)
          .map((n) => n.appSlug as string)
          .concat(parsed.appSlugs || [])
      )
    ).filter((slug) => ANCLORA_APPS.some((a) => a.slug === slug));

    const visionMap: VisionMap = {
      idea,
      summary: parsed.summary || "Mapa visual generado a partir de tu idea.",
      nodes: laidOut,
      connections,
      apps,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(visionMap);
  } catch (err) {
    console.error("generate endpoint error:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo generar el mapa visual: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "AncloraVisionFlow · Generador de mapas visuales",
    status: "ok",
    apps: ANCLORA_APPS.map((a) => a.slug),
  });
}

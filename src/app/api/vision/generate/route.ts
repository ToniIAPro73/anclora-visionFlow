import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLlmClient, llmModel, PROMPT_VERSION } from "@/lib/llm-client";
import { repairTruncatedJson } from "@/lib/llm-utils";
import { createGenerationReceipt } from "@/lib/generation-receipt";
import {
  checkGenerationRateLimit,
  getGenerationRateLimitConfig,
  getGenerationRateLimitKey,
} from "@/lib/generation-rate-limit";
import {
  ANCLORA_APPS,
  findRelevantApps,
  type AncloraApp,
} from "@/lib/anclora-ecosystem";
import { getCatalogForPrompt, type CatalogApp } from "@/lib/anclora-catalog";
import { sanitizeCatalogContent } from "@/lib/sanitize";
import type {
  NodeCategory,
  Priority,
  VisionMap,
  VisionNode,
} from "@/lib/vision-map";
import { autoConnect, layoutVisionMap } from "@/lib/vision-map";

const GenerateSchema = z.object({
  idea: z.string().min(3).max(2000).trim(),
  templateSlug: z.string().optional(),
});

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
  target?: string;
  current?: string;
  unit?: string;
  role?: string;
  contact?: string;
  date?: string;
  milestone?: boolean;
}

interface LLMResponse {
  summary: string;
  appSlugs: string[];
  nodes: RawNode[];
}


function buildSystemPrompt(catalogText: string, allSlugs: string[]): string {
  return `Eres el motor de AncloraVisionFlow. Conviertes ideas del ecosistema Anclora Group en mapas visuales.

CONTEXTO CRÍTICO:
- La Bóveda de Anclora (boveda-anclora) es la FUENTE CANÓNICA de gobierno del ecosistema. Consulta sus contratos, registros y decisiones como autoridad definitiva.
- El presupuesto es MUY LIMITADO. SIEMPRE prioriza: (1) Open Source, (2) Zero-cost, (3) Low-cost (<500€/mes). Evita soluciones propietarias costosas.
- Recomendaciones de herramientas deben ser 100% justificadas por su costo/beneficio. Prefiere alternativas open source aunque sean menos "pulidas".

Genera JSON con estas categorías de nodos (respeta los rangos, no excedas):

- "idea" (1 nodo, núcleo reescrito claro)
- "objective" (3 objetivos medibles)
- "priority" (2 prioridades, campo priority: alta|media|baja)
- "step" (4 pasos, con time y owner)
- "next" (2 próximos pasos)
- "risk" (3 riesgos, con 2 bullets de mitigación cada uno)
- "tool" (3 herramientas — PRIORIZA: (1) Apps Anclora del catálogo, (2) Open Source gratuito, (3) Zero/low-cost. Usa slug exacto en appSlug si aplica.)
- "cost" (2 partidas con cost en EUR — SÉ REALISTA y presupuestado)
- "kpi" (3 KPIs con target, current, unit)
- "stakeholder" (3 con role: Sponsor|Owner|Contributor|External)
- "timeline" (3 hitos con date "Q1 2026", milestone: true para críticos)

REGLAS:
- Español. Títulos máx 6 palabras. Descripciones 12-25 palabras.
- Slugs válidos: ${allSlugs.join(", ")}.
- Summary: 30-50 palabras.
- SIN markdown, SOLO JSON.
- Para herramientas: justifica el coste. Si es open source, menciona "open source" en la descripción.

CATÁLOGO ANCLORA (apps disponibles):
${catalogText}

EJEMPLO JSON:
{"summary":"...","appSlugs":["slug"],"nodes":[{"category":"idea","title":"...","description":"..."},{"category":"objective","title":"...","description":"...","bullets":["..."]},{"category":"priority","title":"...","description":"...","priority":"alta"},{"category":"step","title":"...","description":"...","time":"2 sem","owner":"Backend"},{"category":"next","title":"...","description":"..."},{"category":"risk","title":"...","description":"...","bullets":["m1","m2"]},{"category":"tool","title":"PostgreSQL (open source)","description":"...","appSlug":"nexus"},{"category":"cost","title":"...","description":"...","cost":0},{"category":"kpi","title":"...","description":"...","target":"85","current":"42","unit":"%"},{"category":"stakeholder","title":"...","description":"...","role":"Owner","contact":"x@anclora.es"},{"category":"timeline","title":"...","description":"...","date":"Q1 2026","milestone":true}]}`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const rateLimitConfig = getGenerationRateLimitConfig();
    const rateLimit = checkGenerationRateLimit(
      getGenerationRateLimitKey(req, rateLimitConfig),
      rateLimitConfig
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          code: "RATE_LIMITED",
          message:
            "Has alcanzado el límite temporal de generación. Espera unos segundos antes de intentarlo de nuevo.",
        },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = GenerateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Debes proporcionar una idea válida (3-2000 caracteres)." },
        { status: 400 }
      );
    }
    const idea = parseResult.data.idea;
    const templateSlug = parseResult.data.templateSlug;

    // If templateSlug provided, inject Real Estate metrics context
    const realEstateContext = templateSlug
      ? `\n\nContexto inmobiliario: yield esperado, días en mercado, % leads cualificados, mandatos activos, demanda por nacionalidad.\n`
      : "";

    // Load the catalog from DB (with hardcoded defaults as fallback)
    const { catalogText, apps: catalogApps } = await getCatalogForPrompt(8);
    const allSlugs = catalogApps.map((a) => a.slug);
    const allCatalogAppSlugs = new Set(allSlugs);

    // Determine relevant apps based on the idea (search across the DB catalog)
    const ideaLower = idea.toLowerCase();
    const relevantApps = catalogApps.filter((a) => {
      const haystack = [a.name, a.slug, a.tagline, a.domain, a.description]
        .concat(a.capabilities)
        .concat(a.stack)
        .join(" ")
        .toLowerCase();
      return (
        ideaLower.includes(a.slug.toLowerCase()) ||
        a.capabilities.some((c) => {
          const firstWord = c.toLowerCase().split(/\s+/)[0];
          return firstWord.length > 4 && ideaLower.includes(firstWord);
        }) ||
        a.stack.some((s) => ideaLower.includes(s.toLowerCase()))
      );
    });

    // Build the catalog text for the prompt: relevant apps first, then the rest
    const orderedApps: CatalogApp[] = [
      ...relevantApps,
      ...catalogApps.filter((a) => !relevantApps.includes(a)),
    ].slice(0, 8);

    const orderedCatalogText = orderedApps
      .map((a) => {
        const stack = a.stack.slice(0, 4).join(", ");
        const caps = a.capabilities.slice(0, 3).join(", ");
        const ctx = a.agentsMd
          ? `\n  Contexto extra: ${sanitizeCatalogContent(a.agentsMd)}`
          : "";
        return `- ${a.slug}: ${a.name} — ${a.tagline}. Capacidades: ${caps}. Stack: ${stack}.${ctx}`;
      })
      .join("\n");

    const systemPrompt = buildSystemPrompt(orderedCatalogText, allSlugs);

    const completion = await getLlmClient().chat.completions.create({
      model: llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Idea: """${idea}"""${realEstateContext}\n\nGenera el JSON del mapa visual.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2400,
    });

    const elapsed = Date.now() - startTime;
    const tokensUsed = completion.usage?.total_tokens ?? null;
    console.log(`[vision/generate] LLM responded in ${elapsed}ms, tokens=${tokensUsed ?? "n/a"}`);

    const content = completion.choices?.[0]?.message?.content ?? "";

    // Extract JSON robustly — handle markdown code fences and extra text
    let parsed: LLMResponse;
    try {
      // Strategy 1: strip markdown code fences if present
      let cleaned = content.trim();
      // Remove leading ```json or ``` and trailing ```
      const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
      if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
      }
      // Strategy 2: find the first { and last } (JSON object bounds)
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error("No JSON object found in response");
      }
      let jsonStr = cleaned.slice(firstBrace, lastBrace + 1);

      // Strategy 3: try parsing as-is
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        // Strategy 4: try to repair truncated JSON
        // The LLM may have run out of tokens mid-array. Try to close open arrays/objects.
        const repaired = repairTruncatedJson(jsonStr);
        parsed = JSON.parse(repaired);
      }
    } catch (err) {
      console.error(
        "LLM JSON parse failed:",
        err instanceof Error ? err.message : err
      );
      return NextResponse.json(
        {
          error:
            "No se pudo interpretar el mapa generado. Intenta reformular la idea o generar de nuevo.",
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
      "kpi",
      "stakeholder",
      "timeline",
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
        target: n.target ? String(n.target).slice(0, 40) : undefined,
        current: n.current ? String(n.current).slice(0, 40) : undefined,
        unit: n.unit ? String(n.unit).slice(0, 12) : undefined,
        role: n.role ? String(n.role).slice(0, 40) : undefined,
        contact: n.contact ? String(n.contact).slice(0, 80) : undefined,
        date: n.date ? String(n.date).slice(0, 30) : undefined,
        milestone: typeof n.milestone === "boolean" ? n.milestone : undefined,
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

    // Apps summary (deduplicated) — validate against the dynamic catalog
    const apps = Array.from(
      new Set(
        laidOut
          .filter((n) => n.appSlug)
          .map((n) => n.appSlug as string)
          .concat(parsed.appSlugs || [])
      )
    ).filter((slug) => allCatalogAppSlugs.has(slug));

    const visionMap: VisionMap = {
      idea,
      summary: parsed.summary || "Mapa visual generado a partir de tu idea.",
      nodes: laidOut,
      connections,
      apps,
      generatedAt: new Date().toISOString(),
      palette: "anclora",
      promptVersion: PROMPT_VERSION,
      llmModel,
      tokensUsed,
    };
    visionMap.generationReceipt = createGenerationReceipt(visionMap, {
      promptVersion: PROMPT_VERSION,
      llmModel,
      tokensUsed,
    });

    return NextResponse.json(visionMap);
  } catch (err) {
    console.error("generate endpoint error:", err);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "No se pudo generar el mapa visual. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "AncloraVisionFlow · Generador de mapas visuales",
    status: "ok",
    promptVersion: PROMPT_VERSION,
    llmModel,
    apps: ANCLORA_APPS.map((a) => a.slug),
  });
}

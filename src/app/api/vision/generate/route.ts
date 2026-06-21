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

/**
 * Repair JSON that was truncated because the LLM ran out of tokens.
 * Closes open strings, arrays, and objects in the correct order.
 * Also drops the last incomplete object if it can't be salvaged.
 */
function repairTruncatedJson(jsonStr: string): string {
  let s = jsonStr.trim();

  // If the last character is a comma, drop it
  while (s.endsWith(",")) s = s.slice(0, -1).trimEnd();

  // Walk the string tracking open brackets/braces and string state
  const stack: ("{" | "[")[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") stack.push("{");
    else if (ch === "[") stack.push("[");
    else if (ch === "}") stack.pop();
    else if (ch === "]") stack.pop();
  }

  // If we ended inside a string, close it
  if (inString) {
    s += '"';
  }

  // Drop trailing partial object/array entries:
  // Remove trailing incomplete key-value or object
  // e.g. ...{"category":"step","title":"foo  → remove the last partial object
  // Find the last complete object/array element by scanning back to the last valid comma/brace
  // Simple heuristic: drop trailing characters until we end with } or ] or , or whitespace after a complete value
  // Then close all open brackets in reverse order
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "{") {
      // Before closing, drop trailing comma if present
      s = s.trimEnd();
      if (s.endsWith(",")) s = s.slice(0, -1);
      s += "}";
    } else if (top === "[") {
      s = s.trimEnd();
      if (s.endsWith(",")) s = s.slice(0, -1);
      s += "]";
    }
  }

  return s;
}

function buildSystemPrompt(apps: AncloraApp[]): string {
  // Only include the most relevant apps (up to 6) to keep the prompt compact.
  const appCatalog = apps
    .slice(0, 6)
    .map(
      (a) =>
        `- ${a.slug}: ${a.name} — ${a.tagline}. Capacidades: ${a.capabilities.slice(0, 3).join(", ")}.`
    )
    .join("\n");

  return `Eres el motor de AncloraVisionFlow. Conviertes ideas del ecosistema Anclora Group en mapas visuales.

Genera JSON con estas categorías de nodos (respeta los rangos, no excedas):

- "idea" (1 nodo, núcleo reescrito claro)
- "objective" (3 objetivos medibles)
- "priority" (2 prioridades, campo priority: alta|media|baja)
- "step" (4 pasos, con time y owner)
- "next" (2 próximos pasos)
- "risk" (3 riesgos, con 2 bullets de mitigación cada uno)
- "tool" (3 herramientas — prioriza apps Anclora del catálogo, usa slug exacto en appSlug)
- "cost" (2 partidas con cost en EUR)
- "kpi" (3 KPIs con target, current, unit)
- "stakeholder" (3 con role: Sponsor|Owner|Contributor|External)
- "timeline" (3 hitos con date "Q1 2026", milestone: true para críticos)

REGLAS:
- Español. Títulos máx 6 palabras. Descripciones 12-25 palabras.
- Slugs válidos: ${ANCLORA_APPS.map((a) => a.slug).join(", ")}.
- Summary: 30-50 palabras.
- SIN markdown, SOLO JSON.

CATÁLOGO:
${appCatalog}

SALIDA JSON:
{"summary":"...","appSlugs":["slug"],"nodes":[{"category":"idea","title":"...","description":"..."},{"category":"objective","title":"...","description":"...","bullets":["..."]},{"category":"priority","title":"...","description":"...","priority":"alta"},{"category":"step","title":"...","description":"...","time":"2 sem","owner":"Backend"},{"category":"next","title":"...","description":"..."},{"category":"risk","title":"...","description":"...","bullets":["m1","m2"]},{"category":"tool","title":"Anclora Nexus","description":"...","appSlug":"nexus"},{"category":"cost","title":"...","description":"...","cost":4500},{"category":"kpi","title":"...","description":"...","target":"85","current":"42","unit":"%"},{"category":"stakeholder","title":"...","description":"...","role":"Owner","contact":"x@anclora.es"},{"category":"timeline","title":"...","description":"...","date":"Q1 2026","milestone":true}]}`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const idea: string = (body.idea || "").toString().trim();

    if (!idea || idea.length < 3) {
      return NextResponse.json(
        { error: "Debes proporcionar una idea, proyecto o problema." },
        { status: 400 }
      );
    }

    // Determine relevant apps to enrich the prompt (limit to 6 to keep prompt small)
    const relevantApps = findRelevantApps(idea);
    const appsForPrompt =
      relevantApps.length > 0
        ? [...new Set([...relevantApps, ...ANCLORA_APPS.slice(0, 3)])].slice(0, 6)
        : ANCLORA_APPS.slice(0, 6);

    const systemPrompt = buildSystemPrompt(appsForPrompt);

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Idea: """${idea}"""\n\nGenera el JSON del mapa visual.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2400,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[vision/generate] LLM responded in ${elapsed}ms`);

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
      palette: "anclora",
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

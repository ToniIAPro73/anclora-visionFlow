// Visual map types and layout engine for AncloraVisionFlow.

export type NodeCategory =
  | "idea"
  | "objective"
  | "step"
  | "risk"
  | "tool"
  | "cost"
  | "priority"
  | "next";

export type Priority = "alta" | "media" | "baja";

export interface VisionNode {
  id: string;
  category: NodeCategory;
  title: string;
  description: string;
  /** Optional bullets, e.g. risks, steps, tools */
  bullets?: string[];
  /** Optional cost figure in EUR */
  cost?: number;
  /** Optional priority */
  priority?: Priority;
  /** Optional related Anclora app slug */
  appSlug?: string;
  /** Optional time estimate */
  time?: string;
  /** Optional owner / responsible */
  owner?: string;
  /** Position assigned by layout engine */
  x: number;
  y: number;
  /** Auto-generated */
  relatedTo?: string[];
}

export interface VisionConnection {
  from: string;
  to: string;
  label?: string;
}

export interface VisionMap {
  idea: string;
  summary: string;
  nodes: VisionNode[];
  connections: VisionConnection[];
  apps: string[];
  generatedAt: string;
}

export const CATEGORY_META: Record<
  NodeCategory,
  {
    label: string;
    labelSingular: string;
    color: string;
    icon: string;
    description: string;
  }
> = {
  idea: {
    label: "Idea",
    labelSingular: "Idea",
    color: "#ec4899",
    icon: "Lightbulb",
    description: "Núcleo del proyecto, problema u oportunidad.",
  },
  objective: {
    label: "Objetivos",
    labelSingular: "Objetivo",
    color: "#1dab89",
    icon: "Target",
    description: "Qué se quiere lograr, en términos medibles.",
  },
  step: {
    label: "Pasos",
    labelSingular: "Paso",
    color: "#4f8ef7",
    icon: "Footprints",
    description: "Secuencia de ejecución para alcanzar los objetivos.",
  },
  risk: {
    label: "Riesgos",
    labelSingular: "Riesgo",
    color: "#FF6B5B",
    icon: "AlertTriangle",
    description: "Riesgos y mitigaciones identificadas.",
  },
  tool: {
    label: "Herramientas",
    labelSingular: "Herramienta",
    color: "#D4AF37",
    icon: "Wrench",
    description: "Herramientas y apps del ecosistema Anclora relevantes.",
  },
  cost: {
    label: "Costes",
    labelSingular: "Coste",
    color: "#FF8FB1",
    icon: "Euro",
    description: "Costes estimados, recurring y one-shot.",
  },
  priority: {
    label: "Prioridades",
    labelSingular: "Prioridad",
    color: "#6C48C5",
    icon: "ArrowUpWideNarrow",
    description: "Priorización de objetivos y pasos.",
  },
  next: {
    label: "Próximos pasos",
    labelSingular: "Próximo paso",
    color: "#F59E0B",
    icon: "Rocket",
    description: "Acciones inmediatas y de corto plazo.",
  },
};

export const CATEGORY_ORDER: NodeCategory[] = [
  "idea",
  "objective",
  "priority",
  "step",
  "next",
  "risk",
  "tool",
  "cost",
];

/**
 * Radial layout engine.
 * The idea node sits at the center. Each category forms an arc around it.
 */
export function layoutVisionMap(
  nodes: VisionNode[],
  options: { canvasWidth?: number; canvasHeight?: number } = {}
): VisionNode[] {
  const canvasWidth = options.canvasWidth ?? 2400;
  const canvasHeight = options.canvasHeight ?? 1600;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Idea node at center
  const ideaNode = nodes.find((n) => n.category === "idea");
  const otherNodes = nodes.filter((n) => n.category !== "idea");

  // Group by category
  const byCategory: Record<string, VisionNode[]> = {};
  for (const n of otherNodes) {
    if (!byCategory[n.category]) byCategory[n.category] = [];
    byCategory[n.category].push(n);
  }

  const categoriesPresent = Object.keys(byCategory);
  const result: VisionNode[] = [];

  if (ideaNode) {
    result.push({ ...ideaNode, x: centerX - 200, y: centerY - 90 });
  }

  // Distribute categories around the idea node in a circle
  const radiusX = canvasWidth * 0.32;
  const radiusY = canvasHeight * 0.32;
  const startAngle = -Math.PI / 2; // start at top

  categoriesPresent.forEach((cat, catIdx) => {
    const catAngle = startAngle + (catIdx / categoriesPresent.length) * Math.PI * 2;
    const catNodes = byCategory[cat];
    const groupSize = catNodes.length;

    // spread nodes within a small arc around the category center
    const spread = Math.min(0.5, 0.18 + groupSize * 0.06);

    catNodes.forEach((node, nodeIdx) => {
      const t = groupSize === 1 ? 0 : nodeIdx / (groupSize - 1) - 0.5;
      const angle = catAngle + t * spread;
      const r = 1 + Math.abs(t) * 0.06; // slight outward curve
      const x = centerX + Math.cos(angle) * radiusX * r - 170;
      const y = centerY + Math.sin(angle) * radiusY * r - 70;
      result.push({ ...node, x, y });
    });
  });

  return result;
}

export function createConnection(
  from: string,
  to: string,
  label?: string
): VisionConnection {
  return { from, to, label };
}

/** Auto-connect idea to objectives, objectives to steps/priorities, steps to next, etc. */
export function autoConnect(nodes: VisionNode[]): VisionConnection[] {
  const conns: VisionConnection[] = [];
  const byCat = (c: NodeCategory) => nodes.filter((n) => n.category === c);

  const idea = byCat("idea")[0];
  const objectives = byCat("objective");
  const steps = byCat("step");
  const nexts = byCat("next");
  const risks = byCat("risk");
  const tools = byCat("tool");
  const costs = byCat("cost");
  const priorities = byCat("priority");

  if (idea) {
    objectives.forEach((o) => conns.push(createConnection(idea.id, o.id)));
    priorities.forEach((p) => conns.push(createConnection(idea.id, p.id, "prioriza")));
  }

  objectives.forEach((o, i) => {
    const s = steps[i % Math.max(steps.length, 1)];
    if (s) conns.push(createConnection(o.id, s.id));
    const r = risks[i % Math.max(risks.length, 1)];
    if (r) conns.push(createConnection(o.id, r.id, "mitiga"));
    const c = costs[i % Math.max(costs.length, 1)];
    if (c) conns.push(createConnection(o.id, c.id, "financia"));
  });

  steps.forEach((s, i) => {
    const n = nexts[i % Math.max(nexts.length, 1)];
    if (n) conns.push(createConnection(s.id, n.id, "→"));
  });

  tools.forEach((t) => {
    const target = steps[Math.floor(Math.random() * Math.max(steps.length, 1))] || objectives[0];
    if (target) conns.push(createConnection(t.id, target.id, "apoya"));
  });

  return conns;
}

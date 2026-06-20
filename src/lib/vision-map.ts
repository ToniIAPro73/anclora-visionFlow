// Visual map types and layout engine for AncloraVisionFlow.

export type NodeCategory =
  | "idea"
  | "objective"
  | "step"
  | "risk"
  | "tool"
  | "cost"
  | "priority"
  | "next"
  | "kpi"
  | "stakeholder"
  | "timeline";

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
  /** Optional target value for KPIs */
  target?: string;
  /** Optional current value for KPIs */
  current?: string;
  /** Optional unit for KPIs (%, €, count...) */
  unit?: string;
  /** Optional stakeholder role (Sponsor, Owner, Contributor, External) */
  role?: string;
  /** Optional stakeholder contact */
  contact?: string;
  /** Optional timeline date (ISO string or quarter label) */
  date?: string;
  /** Optional timeline milestone flag */
  milestone?: boolean;
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
  /** Optional palette identifier */
  palette?: PaletteId;
}

export type PaletteId = "anclora" | "nexus" | "premium";

/** Per-palette color overrides for each category. */
export interface Palette {
  id: PaletteId;
  name: string;
  description: string;
  /** Background accent colors */
  background: string;
  surface: string;
  accent: string;
  /** Per-category color overrides (keyed by NodeCategory) */
  categoryColors: Partial<Record<NodeCategory, string>>;
}

export const PALETTES: Record<PaletteId, Palette> = {
  anclora: {
    id: "anclora",
    name: "Anclora Mint",
    description: "Paleta canónica del ecosistema Anclora (mint + navy + gold).",
    background: "#0a0f1f",
    surface: "#0F1629",
    accent: "#1dab89",
    categoryColors: {},
  },
  nexus: {
    id: "nexus",
    name: "Nexus Gold",
    description: "Tema dark de Anclora Nexus con acento oro y deep indigo.",
    background: "#0F1629",
    surface: "#141C3A",
    accent: "#D4AF37",
    categoryColors: {
      idea: "#D4AF37",
      objective: "#F4E4BC",
      priority: "#B8902E",
      step: "#7BA7D9",
      next: "#E6C870",
      risk: "#FF6B5B",
      tool: "#C9A961",
      cost: "#FFB8A8",
      kpi: "#9FE8B8",
      stakeholder: "#A8B8E8",
      timeline: "#F0D67C",
    },
  },
  premium: {
    id: "premium",
    name: "Premium Estate",
    description: "Estilo editorial premium (rosa coral + violeta + crema).",
    background: "#1A0E1F",
    surface: "#2A1530",
    accent: "#ec4899",
    categoryColors: {
      idea: "#ec4899",
      objective: "#F472B6",
      priority: "#A855F7",
      step: "#8B5CF6",
      next: "#FBBF24",
      risk: "#EF4444",
      tool: "#D4AF37",
      cost: "#FB7185",
      kpi: "#34D399",
      stakeholder: "#22D3EE",
      timeline: "#FCD34D",
    },
  },
};

const BASE_CATEGORY_META: Record<
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
  kpi: {
    label: "KPIs",
    labelSingular: "KPI",
    color: "#10b981",
    icon: "TrendingUp",
    description: "Métricas clave y targets medibles para validar el éxito.",
  },
  stakeholder: {
    label: "Stakeholders",
    labelSingular: "Stakeholder",
    color: "#06b6d4",
    icon: "Users",
    description: "Personas, equipos o entidades involucradas o impactadas.",
  },
  timeline: {
    label: "Timeline",
    labelSingular: "Hito",
    color: "#8b5cf6",
    icon: "Calendar",
    description: "Hitos y fechas clave del plan de ejecución.",
  },
};

export function getCategoryMeta(
  cat: NodeCategory,
  palette: PaletteId = "anclora"
) {
  const base = BASE_CATEGORY_META[cat];
  const override = PALETTES[palette]?.categoryColors?.[cat];
  return { ...base, color: override || base.color };
}

/** @deprecated Use getCategoryMeta for palette-aware lookups. */
export const CATEGORY_META = BASE_CATEGORY_META;

export const CATEGORY_ORDER: NodeCategory[] = [
  "idea",
  "objective",
  "priority",
  "step",
  "next",
  "risk",
  "tool",
  "cost",
  "kpi",
  "stakeholder",
  "timeline",
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

  // Group by category — preserve insertion order from CATEGORY_ORDER
  const byCategory: Record<string, VisionNode[]> = {};
  for (const n of otherNodes) {
    if (!byCategory[n.category]) byCategory[n.category] = [];
    byCategory[n.category].push(n);
  }

  // Order categories according to CATEGORY_ORDER for stable layout
  const categoriesPresent = Object.keys(byCategory).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a as NodeCategory);
    const ib = CATEGORY_ORDER.indexOf(b as NodeCategory);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const result: VisionNode[] = [];

  if (ideaNode) {
    result.push({ ...ideaNode, x: centerX - 200, y: centerY - 90 });
  }

  // Distribute categories around the idea node in a circle
  const radiusX = canvasWidth * 0.34;
  const radiusY = canvasHeight * 0.34;
  const startAngle = -Math.PI / 2; // start at top

  categoriesPresent.forEach((cat, catIdx) => {
    const catAngle = startAngle + (catIdx / categoriesPresent.length) * Math.PI * 2;
    const catNodes = byCategory[cat];
    const groupSize = catNodes.length;

    // spread nodes within a small arc around the category center
    const spread = Math.min(0.55, 0.18 + groupSize * 0.06);

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
  const kpis = byCat("kpi");
  const stakeholders = byCat("stakeholder");
  const timelines = byCat("timeline");

  if (idea) {
    objectives.forEach((o) => conns.push(createConnection(idea.id, o.id)));
    priorities.forEach((p) => conns.push(createConnection(idea.id, p.id, "prioriza")));
    stakeholders.forEach((s) => conns.push(createConnection(idea.id, s.id, "involucra")));
    kpis.forEach((k) => conns.push(createConnection(idea.id, k.id, "mide")));
    timelines.forEach((t) => conns.push(createConnection(idea.id, t.id, "planifica")));
  }

  objectives.forEach((o, i) => {
    const s = steps[i % Math.max(steps.length, 1)];
    if (s) conns.push(createConnection(o.id, s.id));
    const r = risks[i % Math.max(risks.length, 1)];
    if (r) conns.push(createConnection(o.id, r.id, "mitiga"));
    const c = costs[i % Math.max(costs.length, 1)];
    if (c) conns.push(createConnection(o.id, c.id, "financia"));
    const k = kpis[i % Math.max(kpis.length, 1)];
    if (k) conns.push(createConnection(o.id, k.id, "mide"));
    const t = timelines[i % Math.max(timelines.length, 1)];
    if (t) conns.push(createConnection(o.id, t.id, "fecha"));
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

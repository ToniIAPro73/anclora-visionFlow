// Anclora Group ecosystem knowledge base.
// Source: README/AGENTS docs of each Anclora application (May 2026 snapshot).

export type AncloraApp = {
  slug: string;
  name: string;
  family: "Premium" | "Internal" | "Tool" | "Platform";
  tagline: string;
  description: string;
  stack: string[];
  accent: string;
  domain: string;
  capabilities: string[];
};

export const ANCLORA_APPS: AncloraApp[] = [
  {
    slug: "nexus",
    name: "Anclora Nexus",
    family: "Platform",
    tagline: "Capa de inteligencia del ecosistema",
    description:
      "Workspace operativo interno y orquestador de agentes. Centraliza inteligencia de ventas, márgenes, automatización y webhook interno para el resto de aplicaciones Anclora.",
    stack: ["Next.js", "TypeScript", "Python", "LangGraph", "PostgreSQL"],
    accent: "#D4AF37",
    domain: "Inteligencia · Orquestación · Agentes",
    capabilities: [
      "Agentes LangGraph (seller prospection)",
      "Command center y automatización",
      "Deal margin y DMS legal review",
      "Webhooks internos",
    ],
  },
  {
    slug: "synergi",
    name: "Anclora Synergi",
    family: "Premium",
    tagline: "Admisiones y backoffice de partners",
    description:
      "Plataforma premium para la admisión, gobernanza y backoffice de partners del ecosistema Anclora. Cumple los contratos UX/UI y de branding del grupo.",
    stack: ["Next.js", "TypeScript", "Tailwind", "SDD"],
    accent: "#6C48C5",
    domain: "Partners · Admisiones · Backoffice",
    capabilities: [
      "Partner auth y admissions backoffice",
      "Analytics y funnel reporting",
      "Observability y admin roles",
      "Branding canónico Anclora",
    ],
  },
  {
    slug: "advisor-ai",
    name: "Anclora Advisor AI",
    family: "Premium",
    tagline: "Asesoría fiscal, laboral e inmobiliaria",
    description:
      "Aplicación de asesoría para autónomos con pluriactividad. Combina Claude, Ollama Mistral y RAG con pgvector para responder consultas fiscales, laborales y de mercado inmobiliario.",
    stack: ["Next.js 15", "React 19", "Supabase", "pgvector", "Claude", "Ollama"],
    accent: "#1dab89",
    domain: "Asesoría · RAG · Pluriactividad",
    capabilities: [
      "RAG con pgvector",
      "Modelos Anthropic + Ollama",
      "Audit trail y RBAC",
      "Módulo fiscal operativo",
    ],
  },
  {
    slug: "content-generator-ai",
    name: "Anclora Content Generator AI",
    family: "Premium",
    tagline: "Motor editorial de content intelligence",
    description:
      "Plataforma de inteligencia editorial para Anclora Private Estates. Dashboard sin scroll global, studio, knowledge base y métricas con Better Auth y Drizzle ORM sobre Neon.",
    stack: ["Next.js 15", "React 19", "Tailwind v4", "Better Auth", "Neon", "Drizzle"],
    accent: "#ec4899",
    domain: "Editorial · Content Intelligence · Real Estate Lujo",
    capabilities: [
      "Studio editorial sin scroll global",
      "Knowledge base con RAG local",
      "Trazabilidad de retrieval",
      "Workspace organizations",
    ],
  },
  {
    slug: "data-lab",
    name: "Anclora Data Lab",
    family: "Premium",
    tagline: "Inteligencia y activos analíticos",
    description:
      "Aplicación independiente de inteligencia y activos analíticos para Anclora Private Estates. Incluye landing premium, solicitud pública de acceso y backoffice de revisión.",
    stack: ["Next.js", "TypeScript", "SDD"],
    accent: "#4f8ef7",
    domain: "Data · Accesos · Backoffice",
    capabilities: [
      "Landing pública premium",
      "Solicitud pública de acceso",
      "Backoffice de admisiones",
      "Workspace analítico",
    ],
  },
  {
    slug: "energyscan",
    name: "Anclora EnergyScan",
    family: "Premium",
    tagline: "Prediagnóstico energético residencial",
    description:
      "Plataforma de prediagnóstico energético orientativo para viviendas. Wizard de captura, motor Scoring v2.1, informe PDF Premium multiidioma y OCR de adjuntos.",
    stack: ["Next.js 14", "TypeScript", "Tailwind", "@react-pdf/renderer", "MapLibre"],
    accent: "#F59E0B",
    domain: "Energía · Scoring · Informes",
    capabilities: [
      "Wizard de captura estructural",
      "Motor Scoring v2.1 por categorías",
      "Informe PDF Premium ES/EN/DE",
      "Catastro y OCR de adjuntos",
    ],
  },
  {
    slug: "filestudio",
    name: "Anclora FileStudio",
    family: "Tool",
    tagline: "Conversor local universal de archivos",
    description:
      "Conversor y procesador de archivos local-first. Web, Desktop PRO, Core, Service, Local Agent y SDK. 50+ formatos en 11 categorías con 9 motores, 100% local y privado.",
    stack: ["Next.js", "FFmpeg", "Sharp", "QPDF", "Pandoc", "LibreOffice", "Tesseract"],
    accent: "#06b6d4",
    domain: "Conversión · Privacidad · Local-first",
    capabilities: [
      "Conversión entre 50+ formatos",
      "Web + Desktop PRO + Service",
      "9 motores de conversión",
      "SDK para Nexus y integraciones",
    ],
  },
  {
    slug: "syncxml",
    name: "Anclora SyncXML",
    family: "Tool",
    tagline: "Sincronización y procesado de XML",
    description:
      "Herramienta open source de sincronización y procesado de feeds XML. Pensada para integraciones de catálogos, inventarios y datos estructurados del ecosistema.",
    stack: ["TypeScript", "Node.js"],
    accent: "#10b981",
    domain: "Sincronización · XML · Integraciones",
    capabilities: [
      "Procesado de feeds XML",
      "Sincronización bidireccional",
      "Integraciones de catálogo",
      "Open source",
    ],
  },
  {
    slug: "private-estates",
    name: "Anclora Private Estates",
    family: "Premium",
    tagline: "Frontend premium inmobiliario",
    description:
      "Frontend premium para Anclora Private Estates construido con React + Vite. Landing, navegación principal y secciones premium con identidad visual cuidada.",
    stack: ["React 19", "TypeScript", "Vite", "Tailwind", "i18next", "GSAP"],
    accent: "#a855f7",
    domain: "Real Estate Lujo · Frontend · Landing",
    capabilities: [
      "Landing premium multilingüe",
      "Menú overlay jerárquico",
      "Animaciones GSAP/ScrollTrigger",
      "SDD y gobernanza de features",
    ],
  },
  {
    slug: "private-estates-landing",
    name: "Anclora Private Estates Landing",
    family: "Premium",
    tagline: "Landing pública premium",
    description:
      "Landing pública específica para Anclora Private Estates. Estructura optimizada, global preferences toggle y SDD dedicado.",
    stack: ["React", "TypeScript", "Tailwind"],
    accent: "#f43f5e",
    domain: "Landing · Conversión · Premium",
    capabilities: [
      "Estructura de landing optimizada",
      "Global preferences toggle",
      "SDD dedicado de landing",
      "Identidad premium",
    ],
  },
];

export const ANCLORA_CONTRACTS = [
  {
    name: "ANCLORA_ECOSYSTEM_CONTRACT_GROUPS",
    purpose: "Define los grupos contractuales del ecosistema Anclora y sus reglas de compatibilidad.",
  },
  {
    name: "ANCLORA_INTERNAL_APP_CONTRACT",
    purpose: "Contrato base para aplicaciones internas: tema dark, tipografía Inter, idiomas es/ca/en/de.",
  },
  {
    name: "ANCLORA_PREMIUM_APP_CONTRACT",
    purpose: "Contrato para apps premium: branding premium, tipografías display (Cormorant Garamond).",
  },
  {
    name: "ANCLORA_BRANDING_MASTER_CONTRACT",
    purpose: "Contrato maestro de branding del grupo Anclora.",
  },
  {
    name: "UI_MOTION_CONTRACT",
    purpose: "Reglas de motion, transiciones y micro-interacciones del ecosistema.",
  },
  {
    name: "MODAL_CONTRACT",
    purpose: "Patrones de modales, diálogos y overlays consistentes en todo el ecosistema.",
  },
  {
    name: "LOCALIZATION_CONTRACT",
    purpose: "Reglas de internacionalización: es/en/de activos, ca pendiente de Locale Copy Guardian.",
  },
];

export const ANCLORA_STACK_TOKENS = {
  primary: "#1dab89", // mint Anclora
  navy: "#0F1629",
  deep: "#141C3A",
  indigo: "#192350",
  gold: "#D4AF37", // accent Nexus
  purple: "#6C48C5",
  coral: "#FF6B5B",
  pink: "#ec4899",
};

export function findRelevantApps(text: string): AncloraApp[] {
  const lower = text.toLowerCase();
  return ANCLORA_APPS.filter((app) => {
    const haystack = [
      app.name,
      app.slug,
      app.tagline,
      app.domain,
      app.description,
      ...app.capabilities,
      ...app.stack,
    ]
      .join(" ")
      .toLowerCase();
    return (
      lower.includes(app.slug.toLowerCase()) ||
      lower.includes(app.name.toLowerCase().replace("anclora ", "")) ||
      app.capabilities.some((c) => lower.includes(c.toLowerCase().split(" ")[0])) ||
      app.stack.some((s) => lower.includes(s.toLowerCase())) ||
      haystack.split(/\W+/).some((w) => w.length > 4 && lower.includes(w))
    );
  });
}

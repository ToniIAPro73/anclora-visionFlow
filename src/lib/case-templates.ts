import type { NodeCategory, PaletteId } from "@/lib/vision-map";
import type { CaseType } from "@prisma/client";

export interface CaseTemplate {
  slug: string;
  type: CaseType;
  name: string;
  description: string;
  paletteId: PaletteId;
  appsImplicadas: string[];
  requiredCategories: NodeCategory[];
  prefilledNodes: Array<{
    category: NodeCategory;
    title: string;
    description?: string;
    unit?: string;
    target?: string;
    role?: string;
    appSlug?: string;
  }>;
  kpiCatalog: Array<{ nombre: string; unidad?: string }>;
  limite: string;
}

export const CASE_TEMPLATES: CaseTemplate[] = [
  {
    slug: "captacion-premium",
    type: "captacion_premium",
    name: "Captación Premium",
    description:
      "Mandato de captación de activo inmobiliario premium. Proceso desde prospección hasta firma.",
    paletteId: "premium",
    appsImplicadas: ["nexus", "energyscan", "advisor-ai"],
    requiredCategories: ["objective", "kpi", "step", "risk", "stakeholder"],
    prefilledNodes: [
      {
        category: "objective",
        title: "Conseguir mandato exclusivo",
        description:
          "Firmar contrato de representación exclusiva con el propietario del activo",
      },
      {
        category: "kpi",
        title: "Probabilidad de mandato",
        unit: "%",
        target: "70",
      },
      {
        category: "kpi",
        title: "Días hasta firma",
        unit: "días",
        target: "30",
      },
      {
        category: "step",
        title: "Valoración inicial",
        description: "Análisis de mercado y valoración AVM del activo",
        appSlug: "nexus",
      },
      {
        category: "step",
        title: "Diagnóstico energético",
        description: "Obtener referencia EnergyScan del activo",
        appSlug: "energyscan",
      },
      {
        category: "step",
        title: "Presentación al propietario",
        description: "Reunión de presentación de la propuesta de captación",
      },
      {
        category: "risk",
        title: "Competencia de otras agencias",
        description: "Riesgo de que el propietario firme con otra agencia primero",
      },
      {
        category: "stakeholder",
        title: "Propietario del activo",
        role: "Owner",
      },
    ],
    kpiCatalog: [
      { nombre: "Probabilidad de mandato", unidad: "%" },
      { nombre: "Valoración estimada", unidad: "€" },
      { nombre: "Días hasta firma", unidad: "días" },
      { nombre: "Yield esperado", unidad: "%" },
      { nombre: "Días en mercado", unidad: "días" },
    ],
    limite: "Mandato exclusivo firmado",
  },
  {
    slug: "comercializacion-activo",
    type: "comercializacion_activo",
    name: "Comercialización de Activo",
    description:
      "Plan de comercialización de un activo inmobiliario desde mandato hasta cierre.",
    paletteId: "anclora",
    appsImplicadas: ["nexus", "content-generator-ai", "data-lab"],
    requiredCategories: ["objective", "kpi", "step", "risk", "stakeholder", "tool"],
    prefilledNodes: [
      {
        category: "objective",
        title: "Cerrar venta o alquiler del activo",
        description: "Conseguir operación firmada en el precio y plazo objetivo",
      },
      {
        category: "kpi",
        title: "% leads cualificados",
        unit: "%",
        target: "25",
      },
      {
        category: "kpi",
        title: "Días en mercado",
        unit: "días",
        target: "90",
      },
      {
        category: "kpi",
        title: "Precio de cierre vs. precio de salida",
        unit: "%",
        target: "95",
      },
      {
        category: "step",
        title: "Preparar dossier de activo",
        description: "Fotografía, descripción y ficha técnica completa",
        appSlug: "content-generator-ai",
      },
      {
        category: "step",
        title: "Análisis de demanda",
        description: "Segmentación de compradores potenciales por perfil y nacionalidad",
        appSlug: "data-lab",
      },
      {
        category: "step",
        title: "Publicación multicanal",
        description: "Portales, redes y base de datos de clientes activos",
        appSlug: "nexus",
      },
      {
        category: "risk",
        title: "Precio fuera de mercado",
        description: "El activo puede estar sobrevalorado respecto al mercado actual",
      },
      {
        category: "tool",
        title: "CRM Nexus",
        appSlug: "nexus",
      },
    ],
    kpiCatalog: [
      { nombre: "% leads cualificados", unidad: "%" },
      { nombre: "Días en mercado", unidad: "días" },
      { nombre: "Precio de cierre vs. salida", unidad: "%" },
      { nombre: "Mandatos activos", unidad: "unidades" },
      { nombre: "Demanda por nacionalidad", unidad: "%" },
    ],
    limite: "Operación firmada y entregada a notaría",
  },
  {
    slug: "contexto-energetico",
    type: "contexto_energetico",
    name: "Contexto Energético",
    description:
      "Análisis energético de un activo para enriquecer propuesta comercial o due diligence.",
    paletteId: "anclora",
    appsImplicadas: ["energyscan", "nexus", "advisor-ai"],
    requiredCategories: ["objective", "kpi", "step", "risk"],
    prefilledNodes: [
      {
        category: "objective",
        title: "Obtener certificación energética del activo",
        description: "Conseguir calificación energética oficial y plan de mejoras",
      },
      {
        category: "kpi",
        title: "Calificación energética objetivo",
        unit: "letra",
        target: "B",
      },
      {
        category: "kpi",
        title: "Ahorro potencial anual",
        unit: "€",
        target: "2000",
      },
      {
        category: "step",
        title: "Inspección energética",
        description: "Visita técnica para recogida de datos del activo",
        appSlug: "energyscan",
      },
      {
        category: "step",
        title: "Generación de informe EnergyScan",
        description: "Procesado de datos y generación de certificado",
        appSlug: "energyscan",
      },
      {
        category: "step",
        title: "Plan de mejoras",
        description: "Recomendaciones de mejora con ROI estimado",
        appSlug: "advisor-ai",
      },
      {
        category: "risk",
        title: "Activo con calificación muy baja",
        description: "Puede afectar negativamente al precio de mercado",
      },
    ],
    kpiCatalog: [
      { nombre: "Calificación energética", unidad: "letra" },
      { nombre: "Ahorro potencial anual", unidad: "€" },
      { nombre: "Reducción CO2", unidad: "kg/año" },
      { nombre: "Coste de mejoras estimado", unidad: "€" },
    ],
    limite: "Certificado energético emitido y plan de mejoras entregado",
  },
  {
    slug: "campana-territorial",
    type: "campana_territorial",
    name: "Campaña Territorial",
    description:
      "Campaña de captación o presencia en una zona geográfica específica.",
    paletteId: "anclora",
    appsImplicadas: ["nexus", "content-generator-ai", "data-lab", "synergi"],
    requiredCategories: ["objective", "kpi", "step", "risk", "stakeholder"],
    prefilledNodes: [
      {
        category: "objective",
        title: "Posicionarse como agencia de referencia en la zona",
        description: "Incrementar visibilidad y captación en el territorio objetivo",
      },
      {
        category: "kpi",
        title: "Nuevos mandatos en zona",
        unit: "unidades",
        target: "5",
      },
      {
        category: "kpi",
        title: "Alcance de campaña",
        unit: "impactos",
        target: "10000",
      },
      {
        category: "step",
        title: "Análisis de mercado territorial",
        description: "Estudio de oferta, demanda y competencia en la zona",
        appSlug: "data-lab",
      },
      {
        category: "step",
        title: "Creación de contenido local",
        description: "Artículos, guías y contenido específico para la zona",
        appSlug: "content-generator-ai",
      },
      {
        category: "step",
        title: "Activación de red de contactos",
        description: "Contacto con propietarios, promotores y colaboradores locales",
        appSlug: "nexus",
      },
      {
        category: "risk",
        title: "Competencia local consolidada",
        description: "Agencias locales con mayor presencia y reconocimiento en la zona",
      },
    ],
    kpiCatalog: [
      { nombre: "Nuevos mandatos en zona", unidad: "unidades" },
      { nombre: "Alcance de campaña", unidad: "impactos" },
      { nombre: "Leads generados", unidad: "leads" },
      { nombre: "Coste por lead", unidad: "€" },
      { nombre: "Tasa de conversión", unidad: "%" },
    ],
    limite: "Campaña activada y primeros mandatos conseguidos",
  },
  {
    slug: "propuesta-partner",
    type: "propuesta_partner",
    name: "Propuesta Partner",
    description:
      "Propuesta de colaboración con un partner estratégico (promotor, inversor, family office).",
    paletteId: "nexus",
    appsImplicadas: ["nexus", "advisor-ai", "data-lab"],
    requiredCategories: ["objective", "kpi", "step", "risk", "stakeholder"],
    prefilledNodes: [
      {
        category: "objective",
        title: "Firmar acuerdo de colaboración con partner",
        description:
          "Establecer relación comercial formal con términos claros y beneficios mutuos",
      },
      {
        category: "kpi",
        title: "Volumen de negocio conjunto estimado",
        unit: "€",
        target: "500000",
      },
      {
        category: "kpi",
        title: "Operaciones conjuntas previstas",
        unit: "unidades",
        target: "3",
      },
      {
        category: "step",
        title: "Análisis del perfil del partner",
        description: "Due diligence y análisis de fit estratégico",
        appSlug: "data-lab",
      },
      {
        category: "step",
        title: "Elaboración de propuesta",
        description: "Documento formal de propuesta de colaboración con términos",
        appSlug: "advisor-ai",
      },
      {
        category: "step",
        title: "Reunión de presentación",
        description: "Presentación de la propuesta y negociación de condiciones",
      },
      {
        category: "risk",
        title: "Conflicto de intereses",
        description: "El partner puede tener acuerdos con competidores",
      },
      {
        category: "stakeholder",
        title: "Decision maker del partner",
        role: "Sponsor",
      },
    ],
    kpiCatalog: [
      { nombre: "Volumen de negocio conjunto", unidad: "€" },
      { nombre: "Operaciones conjuntas", unidad: "unidades" },
      { nombre: "Comisión media por operación", unidad: "%" },
      { nombre: "Tiempo hasta primer cierre", unidad: "días" },
    ],
    limite: "Acuerdo de colaboración firmado y primer proyecto en curso",
  },
];

export function listTemplates(): CaseTemplate[] {
  return CASE_TEMPLATES;
}

export function getTemplate(slug: string): CaseTemplate | undefined {
  return CASE_TEMPLATES.find((t) => t.slug === slug);
}

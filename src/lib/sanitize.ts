// Límite duro de caracteres por campo de catálogo incluido en prompts LLM.
const CATALOG_FIELD_MAX_CHARS = 500;

// Patrones de prompt injection conocidos que deben eliminarse de contenido importado.
const INJECTION_PATTERNS: RegExp[] = [
  /<system[^>]*>[\s\S]*?<\/system>/gi,
  /\[SYSTEM\][\s\S]*?\[\/SYSTEM\]/gi,
  /###\s*SYSTEM[\s\S]*?###/gi,
  /ignore\s+(all\s+)?(previous|prior|above|the previous)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+if\s+you\s+are/gi,
  /new\s+instructions?:/gi,
  /override\s+(system|instructions?|rules?)/gi,
  /system\s+prompt:/gi,
  /jailbreak/gi,
];

/**
 * Sanitiza texto externo importado (README, AGENTS.md, snapshots .txt) antes de
 * incluirlo en prompts del sistema LLM. El texto importado son datos, nunca instrucciones.
 * REQ-AI-006, REQ-ECOSYSTEM-006, DES-AI-004
 */
export function sanitizeCatalogContent(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let sanitized = raw;

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTADO]");
  }

  // Normaliza whitespace excesivo
  sanitized = sanitized.replace(/\s{3,}/g, " ").trim();

  // Límite duro de longitud
  return sanitized.slice(0, CATALOG_FIELD_MAX_CHARS);
}

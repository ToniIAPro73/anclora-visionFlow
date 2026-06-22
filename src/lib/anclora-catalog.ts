// Anclora ecosystem catalog — DB-backed with hardcoded defaults as fallback.
// Supports .txt repo dump imports and GitHub README imports.

import { db } from "@/lib/db";
import { ANCLORA_APPS, type AncloraApp } from "@/lib/anclora-ecosystem";
import { resolveServerWorkspaceId } from "@/lib/workspace-context";

export interface CatalogApp extends AncloraApp {
  id?: string;
  source?: string;
  githubUrl?: string | null;
  readme?: string;
  agentsMd?: string;
  updatedAt?: string;
}

/**
 * Returns the full catalog: DB records first, then hardcoded defaults for any
 * app slug not yet in the DB. This guarantees the catalog is never empty even
 * before any import has happened.
 */
export async function getCatalogApps(): Promise<CatalogApp[]> {
  const workspaceId = resolveServerWorkspaceId();
  let records: Awaited<ReturnType<typeof db.ancloraAppRecord.findMany>> = [];
  try {
    records = await db.ancloraAppRecord.findMany({
      where: { workspaceId },
      orderBy: [{ name: "asc" }],
    });
  } catch (err) {
    console.error("Failed to read catalog from DB, using defaults:", err);
  }

  const dbSlugs = new Set(records.map((r) => r.slug));
  const defaults = ANCLORA_APPS.filter((a) => !dbSlugs.has(a.slug)).map((a) => ({
    ...a,
    source: "default",
  }));

  const fromDb: CatalogApp[] = records.map((r) => ({
    slug: r.slug,
    name: r.name,
    family: r.family as AncloraApp["family"],
    tagline: r.tagline,
    description: r.description,
    stack: safeParseArr(r.stackJson) as string[],
    capabilities: safeParseArr(r.capabilitiesJson) as string[],
    accent: r.accent,
    domain: r.domain,
    id: r.id,
    source: r.source,
    githubUrl: r.githubUrl,
    readme: r.readme,
    agentsMd: r.agentsMd,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return [...fromDb, ...defaults];
}

/**
 * Returns a compact app catalog string suitable for inclusion in the LLM
 * system prompt. Includes AGENTS.md context when available.
 */
export async function getCatalogForPrompt(maxApps = 8): Promise<{
  catalogText: string;
  apps: CatalogApp[];
}> {
  const apps = await getCatalogApps();
  const selected = apps.slice(0, maxApps);
  const catalogText = selected
    .map((a) => {
      const stack = a.stack.slice(0, 4).join(", ");
      const caps = a.capabilities.slice(0, 3).join(", ");
      const ctx = a.agentsMd
        ? `\n  Contexto extra: ${a.agentsMd.slice(0, 300).replace(/\s+/g, " ")}`
        : "";
      return `- ${a.slug}: ${a.name} — ${a.tagline}. Capacidades: ${caps}. Stack: ${stack}.${ctx}`;
    })
    .join("\n");
  return { catalogText, apps: selected };
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

// ============================================================
// .txt parser — for repo dumps like the 10 Anclora .txt files.
// These files contain a directory tree + README.md + AGENTS.md
// concatenated as plain text.
// ============================================================

export interface ParsedApp {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  family: AncloraApp["family"];
  stack: string[];
  capabilities: string[];
  accent: string;
  domain: string;
  readme: string;
  agentsMd: string;
  warnings: string[];
}

/**
 * Parse a single .txt file containing a repo dump.
 * Returns null if no Anclora app could be identified.
 */
export function parseRepoTxt(filename: string, content: string): ParsedApp | null {
  const warnings: string[] = [];
  const text = content;

  // 1. Extract slug from filename: e.g. "toniiapro73-anclora-nexus-8a5edab282632443.txt"
  //    → slug "nexus"
  const slugFromName = extractSlugFromFilename(filename);

  // 2. Find the canonical app name from "# Anclora <Name>" or "# Boveda <Name>" heading.
  //    The heading may include a tagline after a comma:
  //      "# Anclora Nexus, capa de inteligencia"
  //      "# Boveda Anclora" (private vault case)
  //    → name "Nexus", tagline "capa de inteligencia"
  const nameMatch = text.match(/^#\s+(?:Anclora|Boveda)\s+(.+?)$/m);
  if (!nameMatch) return null;
  const headingRest = nameMatch[1].trim();
  let appName = headingRest;
  let taglineFromHeading = "";
  if (headingRest.includes(",")) {
    const parts = headingRest.split(",");
    appName = parts[0].trim();
    taglineFromHeading = parts.slice(1).join(",").trim();
  } else if (headingRest.includes("—") || headingRest.includes("–")) {
    const parts = headingRest.split(/[—–]/);
    appName = parts[0].trim();
    taglineFromHeading = parts.slice(1).join("—").trim();
  }

  // 3. Slug: prefer filename, fallback to slugified name
  const slug = slugFromName || slugify(appName);

  // 4. Tagline: prefer heading tagline, then first paragraph after heading
  const tagline = taglineFromHeading || extractTagline(text, appName);

  // 5. Description: first paragraph after the heading (skipping the tagline if already captured)
  const description = extractDescription(text, appName, tagline);

  // 6. Family: detect from content keywords
  const family = detectFamily(text, appName);

  // 7. Stack: parse "## Stack" or "## Stack tecnológico" section
  const stack = extractStack(text);

  // 8. Capabilities: parse "## Características principales", "## Incluye",
  //    "## Contenidos", "## Features" sections
  const capabilities = extractCapabilities(text);

  // 9. Accent color: parse "## Branding canónico" section
  const accent = extractAccentColor(text) || defaultAccent(slug);

  // 10. Domain: derive from tagline + capabilities
  const domain = deriveDomain(text, appName);

  // 11. AGENTS.md / MEMORY.md context: look for "AGENTS.md" or "MEMORY.md"
  //     headers and extract a compact context block
  const agentsMd = extractAgentsContext(text);

  // 12. README raw: extract everything from "# Anclora" heading onwards
  const readme = extractReadme(text);

  return {
    slug,
    name: `Anclora ${appName}`,
    tagline: tagline || `App del ecosistema Anclora`,
    description: description || tagline,
    family,
    stack: stack.length > 0 ? stack : ["Next.js", "TypeScript"],
    capabilities: capabilities.length > 0 ? capabilities : ["N/D"],
    accent,
    domain,
    readme,
    agentsMd,
    warnings,
  };
}

function extractSlugFromFilename(filename: string): string {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, "");
  // Patterns:
  //   "toniiapro73-anclora-nexus-HASH" → "nexus"
  //   "anclora-nexus" → "nexus"
  //   "nexus" → "nexus"
  const m = base.match(/anclora[-_]?([a-z0-9]+(?:-[a-z0-9]+)*?)(?:-[a-f0-9]{8,})?$/i);
  if (m) {
    // Filter out hash-like trailing segments (8+ hex chars)
    const slug = m[1]
      .toLowerCase()
      .split("-")
      .filter((seg) => !/^[a-f0-9]{8,}$/.test(seg))
      .join("-");
    if (slug) return slug.replace(/[^a-z0-9-]/g, "");
  }
  // Fallback: last segment
  const parts = base.split(/[-_]/);
  return parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractTagline(text: string, appName: string): string {
  // First paragraph after "# Anclora <appName>" or "# Boveda <appName>"
  let headingIdx = text.indexOf(`# Anclora ${appName}`);
  if (headingIdx === -1) {
    headingIdx = text.indexOf(`# Boveda ${appName}`);
  }
  if (headingIdx === -1) return "";
  const after = text.slice(headingIdx + appName.length + 12);
  // Skip the heading line itself
  const lines = after.split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) break;
    if (trimmed.startsWith("```")) break;
    if (trimmed.startsWith("![") || trimmed.startsWith("[![")) continue;
    // Stop at section markers
    if (/^(Stack|Características|Contenidos|Quick|Entrada|Incluye|Estado|Principios|Roadmap|Branding|Contratos)/i.test(trimmed)) break;
    return trimmed;
  }
  return "";
}

function extractDescription(text: string, appName: string, tagline: string): string {
  // Collect up to 2 paragraphs after the tagline
  let headingIdx = text.indexOf(`# Anclora ${appName}`);
  if (headingIdx === -1) {
    headingIdx = text.indexOf(`# Boveda ${appName}`);
  }
  if (headingIdx === -1) return tagline;
  const after = text.slice(headingIdx);
  const lines = after.split(/\r?\n/);
  const paragraphs: string[] = [];
  let current = "";
  let skippedHeading = false;
  let skippedFirst = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) {
        paragraphs.push(current);
        current = "";
      }
      continue;
    }
    if (!skippedHeading) {
      skippedHeading = true;
      continue;
    }
    if (trimmed.startsWith("#")) break;
    if (trimmed.startsWith("```") || trimmed.startsWith("![") || trimmed.startsWith("[-")) continue;
    if (/^(Stack|Características|Contenidos|Quick|Entrada|Incluye|Estado|Principios|Roadmap|Branding|Contratos)/i.test(trimmed)) break;
    if (!skippedFirst) {
      skippedFirst = true;
      continue; // skip tagline (already captured)
    }
    current += (current ? " " : "") + trimmed;
    if (paragraphs.length >= 1 && current.length > 120) break;
  }
  if (current) paragraphs.push(current);

  const desc = paragraphs.join(" ").slice(0, 500);
  return desc || tagline;
}

function detectFamily(text: string, appName: string): AncloraApp["family"] {
  const lower = text.toLowerCase();
  if (/landing/.test(appName.toLowerCase())) return "Premium";
  if (/\bopen source\b/i.test(text)) return "Tool";
  if (/premium|lujo|real estate|private estates/.test(lower)) return "Premium";
  if (/nexus|synergi|backoffice|internal|workspace operativo/.test(lower)) return "Platform";
  if (/convert|converter|local-first|file/i.test(lower)) return "Tool";
  if (/advisor|asesoría|asesoria/.test(lower)) return "Premium";
  return "Premium";
}

function extractStack(text: string): string[] {
  // Look for "## Stack" or "## Stack tecnológico"
  const stackSection = text.match(/^##\s+(?:Stack(?:\s+tecnol[oó]gico)?)\s*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/im);
  if (!stackSection) return [];
  const body = stackSection[1];
  // Parse bullet list or comma-separated
  const bullets = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("•"))
    .map((l) => l.replace(/^[-•]\s*/, "").trim());
  if (bullets.length > 0) return dedupe(bullets).slice(0, 8);

  // Fallback: comma-separated on a single line
  const line = body.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("#"));
  if (line) return dedupe(line.split(",").map((s) => s.trim())).slice(0, 8);

  return [];
}

function extractCapabilities(text: string): string[] {
  // Try multiple section headers
  const headers = [
    "Características principales",
    "Contenidos",
    "Incluye",
    "Features",
    "Capacidades",
    "Product Surfaces",
  ];
  for (const h of headers) {
    const re = new RegExp(`^##\\s+${h}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n#\\s|$)`, "im");
    const m = text.match(re);
    if (!m) continue;
    const body = m[1];
    // Parse table rows (skip header) or bullet list
    const tableRows = body
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("|") && !l.includes("---"))
      .map((l) => l.split("|").map((c) => c.trim()).filter(Boolean))
      .filter((arr) => arr.length >= 2);
    if (tableRows.length > 0) {
      return dedupe(tableRows.map((r) => r[0]).filter((s) => s && !/^M[oó]dulo$/i.test(s))).slice(0, 6);
    }
    const bullets = body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-") || l.startsWith("•"))
      .map((l) => l.replace(/^[-•]\s*(?:\*\*)?/, "").replace(/\*\*:?$/, "").trim());
    if (bullets.length > 0) return dedupe(bullets).slice(0, 6);
  }
  return [];
}

function extractAccentColor(text: string): string | null {
  // Look for "accent" + hex color in branding section
  const m = text.match(/accent[^#]*#([0-9a-fA-F]{6})/i);
  if (m) return `#${m[1].toLowerCase()}`;
  // Look for "oro" / "gold" / "mint" patterns
  if (/accent.*gold|accent.*oro/i.test(text)) return "#D4AF37";
  if (/accent.*mint/i.test(text)) return "#1dab89";
  return null;
}

function defaultAccent(slug: string): string {
  const map: Record<string, string> = {
    nexus: "#D4AF37",
    synergi: "#6C48C5",
    "advisor-ai": "#1dab89",
    "content-generator-ai": "#ec4899",
    "data-lab": "#4f8ef7",
    energyscan: "#F59E0B",
    filestudio: "#06b6d4",
    syncxml: "#10b981",
    "private-estates": "#a855f7",
    "private-estates-landing": "#f43f5e",
  };
  return map[slug] || "#1dab89";
}

function deriveDomain(text: string, appName: string): string {
  // Use tagline + first heading words
  const words = appName.split(/[\s-]+/).filter((w) => w.length > 2);
  if (words.length === 0) return "";
  return words.slice(0, 3).join(" · ");
}

function extractAgentsContext(text: string): string {
  // Look for AGENTS.md or MEMORY.md sections
  const headers = ["AGENTS.md", "MEMORY.md", "brain.md", "soul.md"];
  const chunks: string[] = [];
  for (const h of headers) {
    const re = new RegExp(`(?:^|\\n)#{1,3}\\s+${h.replace(".", "\\.")}\\s*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s+|\\Z)`, "i");
    const m = text.match(re);
    if (m) {
      const body = m[1].trim().slice(0, 500);
      if (body) chunks.push(`[${h}] ${body}`);
    }
  }
  return chunks.join("\n\n").slice(0, 1500);
}

function extractReadme(text: string): string {
  // Extract from "# Anclora" or "# Boveda" onwards
  const idx = text.search(/^#\s+(?:Anclora|Boveda)\s/m);
  if (idx === -1) return text.slice(0, 4000);
  return text.slice(idx, idx + 6000);
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}

// ============================================================
// GitHub importer — fetch raw README + AGENTS.md
// ============================================================

export interface GithubImportResult {
  ok: boolean;
  app?: ParsedApp;
  error?: string;
  repoUrl?: string;
}

/**
 * Import an app from a GitHub URL by fetching the raw README.md,
 * AGENTS.md, and MEMORY.md from the default branch.
 */
export async function importFromGithub(
  repoUrl: string
): Promise<GithubImportResult> {
  try {
    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) {
      return { ok: false, error: "URL de GitHub inválida. Ejemplo: https://github.com/ToniIAPro73/anclora-nexus" };
    }
    const { owner, repo } = parsed;

    // Try main first, then master
    const branches = ["main", "master"];
    let readme = "";
    let agentsMd = "";
    let readmeFound = false;

    for (const branch of branches) {
      const readmeRes = await fetchRawGithub(owner, repo, branch, "README.md");
      if (readmeRes.ok) {
        readme = readmeRes.text;
        readmeFound = true;
        // Also try AGENTS.md and MEMORY.md
        const agentsRes = await fetchRawGithub(owner, repo, branch, "AGENTS.md");
        if (agentsRes.ok) agentsMd += `[AGENTS.md]\n${agentsRes.text}\n\n`;
        const memRes = await fetchRawGithub(owner, repo, branch, "MEMORY.md");
        if (memRes.ok) agentsMd += `[MEMORY.md]\n${memRes.text}\n\n`;
        break;
      }
    }

    if (!readmeFound) {
      return {
        ok: false,
        error: `No se pudo leer README.md en ${owner}/${repo}. ¿Es un repo privado?`,
        repoUrl,
      };
    }

    // Parse README with the same parser
    const fakeFilename = `anclora-${repo.replace(/^anclora-/, "")}.txt`;
    const combined = `${fakeFilename}\n\n${readme}\n\n${agentsMd}`;
    const parsedApp = parseRepoTxt(fakeFilename, combined);
    if (!parsedApp) {
      return {
        ok: false,
        error: "No se pudo identificar un encabezado '# Anclora <Name>' en el README.",
        repoUrl,
      };
    }

    return {
      ok: true,
      app: parsedApp,
      repoUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al importar desde GitHub",
    };
  }
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  // Patterns:
  //   https://github.com/OWNER/REPO
  //   https://github.com/OWNER/REPO/blob/main/README.md
  //   github.com/OWNER/REPO
  const m = url.match(/github\.com\/([^\/\s]+)\/([^\/\s?#]+)/i);
  if (!m) return null;
  const owner = m[1];
  let repo = m[2].replace(/\.git$/i, "");
  // Strip trailing path segments
  repo = repo.split("/")[0];
  if (!owner || !repo) return null;
  return { owner, repo };
}

async function fetchRawGithub(
  owner: string,
  repo: string,
  branch: string,
  file: string
): Promise<{ ok: boolean; text: string }> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`;
  try {
    const headers: Record<string, string> = {
      "User-Agent": "AncloraVisionFlow/1.0",
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, text: "" };
    const text = await res.text();
    return { ok: true, text };
  } catch {
    return { ok: false, text: "" };
  }
}

// ============================================================
// DB upsert helpers
// ============================================================

export async function upsertCatalogApp(app: ParsedApp, source: string, githubUrl?: string) {
  const workspaceId = resolveServerWorkspaceId();
  return db.ancloraAppRecord.upsert({
    where: { workspaceId_slug: { workspaceId, slug: app.slug } },
    create: {
      workspaceId,
      slug: app.slug,
      name: app.name,
      family: app.family,
      tagline: app.tagline,
      description: app.description,
      stackJson: JSON.stringify(app.stack),
      capabilitiesJson: JSON.stringify(app.capabilities),
      accent: app.accent,
      domain: app.domain,
      source,
      githubUrl: githubUrl || null,
      readme: app.readme,
      agentsMd: app.agentsMd,
    },
    update: {
      name: app.name,
      family: app.family,
      tagline: app.tagline,
      description: app.description,
      stackJson: JSON.stringify(app.stack),
      capabilitiesJson: JSON.stringify(app.capabilities),
      accent: app.accent,
      domain: app.domain,
      source,
      ...(githubUrl ? { githubUrl } : {}),
      readme: app.readme,
      agentsMd: app.agentsMd,
    },
  });
}

export async function deleteCatalogApp(id: string) {
  const workspaceId = resolveServerWorkspaceId();
  const result = await db.ancloraAppRecord.deleteMany({ where: { id, workspaceId } });
  if (result.count === 0) {
    throw new Error("Catalog app not found in current workspace");
  }
  return result;
}

export async function updateCatalogAppFields(
  id: string,
  fields: Partial<{
    name: string;
    slug: string;
    family: string;
    tagline: string;
    description: string;
    accent: string;
    domain: string;
    stack: string[];
    capabilities: string[];
    githubUrl: string | null;
  }>
) {
  const workspaceId = resolveServerWorkspaceId();
  const data: Record<string, unknown> = {};
  if (fields.name !== undefined) data.name = fields.name;
  if (fields.slug !== undefined) data.slug = fields.slug;
  if (fields.family !== undefined) data.family = fields.family;
  if (fields.tagline !== undefined) data.tagline = fields.tagline;
  if (fields.description !== undefined) data.description = fields.description;
  if (fields.accent !== undefined) data.accent = fields.accent;
  if (fields.domain !== undefined) data.domain = fields.domain;
  if (fields.stack !== undefined) data.stackJson = JSON.stringify(fields.stack);
  if (fields.capabilities !== undefined) data.capabilitiesJson = JSON.stringify(fields.capabilities);
  if (fields.githubUrl !== undefined) data.githubUrl = fields.githubUrl;
  const existing = await db.ancloraAppRecord.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Catalog app not found in current workspace");
  }
  return db.ancloraAppRecord.update({ where: { id }, data });
}

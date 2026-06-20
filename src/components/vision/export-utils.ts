// SVG-based export for AncloraVisionFlow.
// We bypass html2canvas entirely (it can't parse oklch/lab from Tailwind v4).
// Instead we render a self-contained SVG string that can be drawn to a canvas
// and exported as PNG or embedded into a PDF.

import type { VisionMap, VisionNode } from "@/lib/vision-map";
import { CATEGORY_META } from "@/lib/vision-map";
import { ANCLORA_APPS } from "@/lib/anclora-ecosystem";

const ICON_PATHS: Record<string, string> = {
  Lightbulb:
    "M9 18h6m-5 3h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z",
  Target:
    "M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
  Footprints:
    "M4 16v-2.5c0-1.4.4-2.5 1-3.5.4-.7.5-1.5.5-2.3V4a2 2 0 1 1 4 0v3l2 2 2-2V4a2 2 0 1 1 4 0v3.7c0 .8.1 1.6.5 2.3.6 1 1 2.1 1 3.5V16a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1h-4v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
  AlertTriangle:
    "M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0zM12 9v4m0 4h.01",
  Wrench:
    "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.4-.6-.6-2.4 2.1-2.1z",
  Euro: "M14 21V19a8 8 0 1 0 0-14M4 11h12M4 7h12",
  ArrowUpWideNarrow:
    "M3 6h13l-3-3M3 12h17l-3-3M3 18h9l-3-3",
  Rocket:
    "M5 16c-1.5 0-3 .5-3 3v3h6v-3c0-2.5-1.5-3-3-3zM12 2c4 0 8 4 8 8 0 3-1.5 5.5-3 7l-3 1H10l-3-1c-1.5-1.5-3-4-3-7 0-4 4-8 8-8zM12 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
};

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textWrap(text: string, maxChars: number): string[] {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function nodeRect(x: number, y: number, isIdea: boolean): Rect {
  const w = isIdea ? 360 : 320;
  const h = isIdea ? 210 : 180;
  return { x, y, w, h };
}

function buildNodeSVG(node: VisionNode): string {
  const meta = CATEGORY_META[node.category];
  const isIdea = node.category === "idea";
  const r = nodeRect(node.x, node.y, isIdea);
  const color = meta.color;

  const iconPath = ICON_PATHS[meta.icon] || ICON_PATHS.Target;
  const iconX = r.x + 16;
  const iconY = r.y + 16;

  const titleLines = textWrap(node.title, isIdea ? 32 : 28).slice(0, 2);
  const descLines = textWrap(node.description, isIdea ? 42 : 36).slice(0, 3);
  const titleStartY = iconY + 32 + 18;
  const descStartY = titleStartY + titleLines.length * 16 + 8;

  let svg = `<g>`;

  // Card background
  if (isIdea) {
    svg += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" fill="${color}26" stroke="${color}66" stroke-width="1.5"/>`;
    svg += `<rect x="${r.x}" y="${r.y}" width="3" height="${r.h}" fill="${color}"/>`;
    svg += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" fill="${color}" opacity="0.07"/>`;
  } else {
    svg += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" fill="${color}22" stroke="${color}66" stroke-width="1"/>`;
    svg += `<rect x="${r.x}" y="${r.y}" width="3" height="${r.h}" fill="${color}"/>`;
  }

  // Icon container
  svg += `<rect x="${iconX}" y="${iconY}" width="32" height="32" rx="6" fill="${color}44"/>`;
  svg += `<path d="${iconPath}" transform="translate(${iconX + 6}, ${iconY + 6}) scale(0.83)" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  // Category label
  svg += `<text x="${iconX + 40}" y="${iconY + 13}" fill="${color}" font-size="10" font-weight="700" font-family="Inter, Arial, sans-serif" letter-spacing="1.2">${escapeXml(meta.labelSingular.toUpperCase())}</text>`;

  // Title
  titleLines.forEach((line, i) => {
    svg += `<text x="${iconX + 40}" y="${iconY + 28 + i * 15}" fill="#f5f5f5" font-size="13" font-weight="700" font-family="Inter, Arial, sans-serif">${escapeXml(line)}</text>`;
  });

  // Description
  descLines.forEach((line, i) => {
    svg += `<text x="${r.x + 16}" y="${descStartY + i * 14}" fill="#c8c8d0" font-size="11" font-family="Inter, Arial, sans-serif">${escapeXml(line)}</text>`;
  });

  // Divider
  const dividerY = descStartY + descLines.length * 14 + 6;
  svg += `<line x1="${r.x + 16}" y1="${dividerY}" x2="${r.x + r.w - 16}" y2="${dividerY}" stroke="#ffffff" stroke-opacity="0.12"/>`;

  // Bottom row
  const by = dividerY + 18;
  let bx = r.x + 16;
  if (node.cost !== undefined) {
    const txt = node.cost.toLocaleString("es-ES") + " €";
    svg += `<text x="${bx}" y="${by}" fill="#f5f5f5" font-size="12" font-weight="700" font-family="Inter, Arial, sans-serif">${escapeXml(txt)}</text>`;
    bx += txt.length * 7 + 16;
  }
  if (node.time) {
    svg += `<text x="${bx}" y="${by}" fill="#a8a8b8" font-size="10" font-family="Inter, Arial, sans-serif">⏱ ${escapeXml(node.time)}</text>`;
    bx += node.time.length * 6 + 30;
  }
  if (node.owner) {
    svg += `<text x="${bx}" y="${by}" fill="#a8a8b8" font-size="10" font-family="Inter, Arial, sans-serif">👤 ${escapeXml(node.owner)}</text>`;
  }
  // App slug chip
  if (node.appSlug) {
    const chipW = node.appSlug.length * 6 + 14;
    svg += `<rect x="${r.x + r.w - 16 - chipW}" y="${by - 11}" width="${chipW}" height="16" rx="4" fill="${color}44"/>`;
    svg += `<text x="${r.x + r.w - 16 - chipW / 2}" y="${by + 1}" fill="${color}" font-size="9" font-weight="700" font-family="monospace" text-anchor="middle">${escapeXml(node.appSlug)}</text>`;
  }

  // Priority badge
  if (node.priority) {
    const pColor = node.priority === "alta" ? "#FF6B5B" : node.priority === "media" ? "#F59E0B" : "#7DD3FC";
    const badgeW = 40;
    svg += `<rect x="${r.x + r.w - 16 - badgeW}" y="${iconY + 4}" width="${badgeW}" height="18" rx="9" fill="${pColor}33"/>`;
    svg += `<text x="${r.x + r.w - 16 - badgeW / 2}" y="${iconY + 17}" fill="${pColor}" font-size="9" font-weight="800" font-family="Inter, Arial, sans-serif" text-anchor="middle">${escapeXml(node.priority.toUpperCase())}</text>`;
  }

  // Bullets
  if (node.bullets && node.bullets.length > 0) {
    const bulletStart = by + 16;
    node.bullets.slice(0, 3).forEach((b, i) => {
      const by2 = bulletStart + i * 14;
      svg += `<circle cx="${r.x + 20}" cy="${by2 - 3}" r="1.8" fill="${color}"/>`;
      const bulletLines = textWrap(b, 40).slice(0, 1);
      svg += `<text x="${r.x + 26}" y="${by2}" fill="#b8b8c0" font-size="10" font-family="Inter, Arial, sans-serif">${escapeXml(bulletLines[0] || "")}</text>`;
    });
  }

  svg += `</g>`;
  return svg;
}

function buildConnectionSVG(map: VisionMap): string {
  const nodeMap = new Map(map.nodes.map((n) => [n.id, n]));
  let svg = "";
  for (const conn of map.connections) {
    const from = nodeMap.get(conn.from);
    const to = nodeMap.get(conn.to);
    if (!from || !to) continue;
    const rFrom = nodeRect(from.x, from.y, from.category === "idea");
    const rTo = nodeRect(to.x, to.y, to.category === "idea");
    const fx = rFrom.x + rFrom.w / 2;
    const fy = rFrom.y + rFrom.h / 2;
    const tx = rTo.x + rTo.w / 2;
    const ty = rTo.y + rTo.h / 2;
    const dx = tx - fx;
    const dy = ty - fy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;
    const offsetMag = Math.min(60, dist * 0.18);
    const nx = -dy / dist;
    const ny = dx / dist;
    const ctrlX = (fx + tx) / 2 + nx * offsetMag;
    const ctrlY = (fy + ty) / 2 + ny * offsetMag;
    svg += `<path d="M ${fx} ${fy} Q ${ctrlX} ${ctrlY} ${tx} ${ty}" fill="none" stroke="#9ca3ff" stroke-width="1.4" stroke-opacity="0.45" stroke-dasharray="4 4"/>`;
  }
  return svg;
}

export function buildVisionSVG(map: VisionMap): string {
  const w = 2400;
  const h = 1600;

  let svgContent = "";

  // Defs (gradients + grid pattern)
  svgContent += `<defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
    <radialGradient id="bg1" cx="20%" cy="20%" r="40%">
      <stop offset="0%" stop-color="#1dab89" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#1dab89" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg2" cx="80%" cy="30%" r="40%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg3" cx="50%" cy="80%" r="45%">
      <stop offset="0%" stop-color="#6C48C5" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#6C48C5" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="title-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1dab89"/>
      <stop offset="50%" stop-color="#6C48C5"/>
      <stop offset="100%" stop-color="#D4AF37"/>
    </linearGradient>
  </defs>`;

  // Backgrounds
  svgContent += `<rect width="${w}" height="${h}" fill="#0a0f1f"/>`;
  svgContent += `<rect width="${w}" height="${h}" fill="url(#bg1)"/>`;
  svgContent += `<rect width="${w}" height="${h}" fill="url(#bg2)"/>`;
  svgContent += `<rect width="${w}" height="${h}" fill="url(#bg3)"/>`;
  svgContent += `<rect width="${w}" height="${h}" fill="url(#grid)"/>`;

  // Title bar
  svgContent += `<text x="40" y="56" fill="url(#title-grad)" font-size="32" font-weight="800" font-family="Inter, Arial, sans-serif">AncloraVisionFlow</text>`;
  svgContent += `<text x="40" y="86" fill="#c8c8d0" font-size="13" font-family="Inter, Arial, sans-serif">${escapeXml(map.idea.slice(0, 140))}</text>`;
  svgContent += `<text x="${w - 40}" y="56" fill="#a8a8b8" font-size="11" font-family="Inter, Arial, sans-serif" text-anchor="end">${escapeXml(new Date(map.generatedAt).toLocaleString("es-ES"))}</text>`;
  svgContent += `<text x="${w - 40}" y="78" fill="#a8a8b8" font-size="11" font-family="Inter, Arial, sans-serif" text-anchor="end">${map.nodes.length} nodos · ${map.apps.length} apps Anclora</text>`;

  // Summary text
  if (map.summary) {
    svgContent += `<text x="40" y="118" fill="#9090a0" font-size="11" font-family="Inter, Arial, sans-serif">${escapeXml(map.summary.slice(0, 220))}</text>`;
  }

  // Apps legend chips
  let appX = 40;
  const appY = 145;
  svgContent += `<text x="${appX}" y="${appY}" fill="#a8a8b8" font-size="10" font-weight="700" font-family="Inter, Arial, sans-serif" letter-spacing="1.2">APPS ANCLORA:</text>`;
  appX += 130;
  for (const slug of map.apps) {
    const app = ANCLORA_APPS.find((a) => a.slug === slug);
    if (!app) continue;
    const label = app.name.replace("Anclora ", "");
    const tw = label.length * 6.5 + 26;
    svgContent += `<rect x="${appX}" y="${appY - 12}" width="${tw}" height="20" rx="10" fill="${app.accent}22" stroke="${app.accent}66" stroke-width="1"/>`;
    svgContent += `<text x="${appX + tw / 2}" y="${appY + 2}" fill="${app.accent}" font-size="10" font-weight="700" font-family="Inter, Arial, sans-serif" text-anchor="middle">${escapeXml(label)}</text>`;
    appX += tw + 10;
    if (appX > w - 200) break;
  }

  // Connections (drawn below nodes)
  svgContent += buildConnectionSVG(map);

  // Nodes
  for (const node of map.nodes) {
    svgContent += buildNodeSVG(node);
  }

  // Footer legend (categories)
  let legX = 40;
  const legY = h - 30;
  svgContent += `<text x="${legX}" y="${legY}" fill="#a8a8b8" font-size="10" font-weight="700" font-family="Inter, Arial, sans-serif" letter-spacing="1.2">LEYENDA:</text>`;
  legX += 90;
  const cats: (keyof typeof CATEGORY_META)[] = ["idea", "objective", "priority", "step", "next", "risk", "tool", "cost"];
  for (const cat of cats) {
    const meta = CATEGORY_META[cat];
    svgContent += `<rect x="${legX}" y="${legY - 9}" width="11" height="11" rx="2" fill="${meta.color}"/>`;
    svgContent += `<text x="${legX + 16}" y="${legY}" fill="#c8c8d0" font-size="10" font-family="Inter, Arial, sans-serif">${escapeXml(meta.label)}</text>`;
    legX += 16 + meta.label.length * 6 + 16;
  }

  // Watermark
  svgContent += `<text x="${w - 40}" y="${legY}" fill="#585868" font-size="9" font-family="Inter, Arial, sans-serif" text-anchor="end">Generado por AncloraVisionFlow · anclora.group</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgContent}</svg>`;
}

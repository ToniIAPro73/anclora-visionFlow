import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export async function buildSddExport(
  caseId: string,
  workspaceId: string,
  actorId: string
): Promise<{ document: string; prUrl: string | null }> {
  const c = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: { mapVersions: { orderBy: { version: "desc" }, take: 1 } },
  });

  const brief = c.brief as Record<string, unknown>;
  const document = `---
feature: AVF-CASE-${c.id.slice(-6).toUpperCase()}
familia: real-estate
tipo: ${c.type}
plantilla: ${c.templateSlug}
estado: ${c.status}
workspaceId: ${c.workspaceId}
kpis: ${JSON.stringify((brief.kpis as unknown[]) ?? [])}
appsImplicadas: ${JSON.stringify(brief.appsImplicadas ?? [])}
stakeholders: []
timeline: por-definir
---

# Spec: ${c.title}

## Objetivo
${brief.objetivo}

## Supuestos
${((brief.supuestos as string[]) ?? []).map((s: string) => `- ${s}`).join("\n")}

## Riesgos
${((brief.riesgos as string[]) ?? []).map((r: string) => `- ${r}`).join("\n")}

## Próximo paso
**Acción:** ${(brief.proximoPaso as Record<string, unknown>)?.accion}
**Responsable:** ${(brief.proximoPaso as Record<string, unknown>)?.responsable}
`;

  // Open GitHub PR if token available
  let prUrl: string | null = null;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.BOVEDA_REPO; // e.g. "ToniIAPro73/boveda-anclora"

  if (ghToken && ghRepo) {
    try {
      const branch = `sdd/case-${caseId}-${Date.now()}`;
      const path = `docs/specs/cases/${caseId}.md`;
      const content = Buffer.from(document).toString("base64");

      // Get default branch SHA
      const repoRes = await fetch(`https://api.github.com/repos/${ghRepo}`, {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      const repoData = (await repoRes.json()) as { default_branch: string };

      const branchRes = await fetch(
        `https://api.github.com/repos/${ghRepo}/git/refs/heads/${repoData.default_branch}`,
        {
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      const branchData = (await branchRes.json()) as { object: { sha: string } };

      // Create branch
      await fetch(`https://api.github.com/repos/${ghRepo}/git/refs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: branchData.object.sha }),
      });

      // Create file
      await fetch(`https://api.github.com/repos/${ghRepo}/contents/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `docs: add SDD spec for case ${caseId}`,
          content,
          branch,
        }),
      });

      // Create PR
      const prRes = await fetch(`https://api.github.com/repos/${ghRepo}/pulls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `SDD: ${c.title}`,
          body: "Spec generada desde VisionFlow",
          head: branch,
          base: repoData.default_branch,
        }),
      });
      const prData = (await prRes.json()) as { html_url?: string };
      prUrl = prData.html_url ?? null;
    } catch (err) {
      console.error("GitHub PR creation failed:", err);
    }
  }

  const sddRecord = await db.sddExport.create({
    data: {
      caseId,
      workspaceId,
      document,
      prUrl,
      status: prUrl ? "pr_open" : "generated",
      createdById: actorId,
    },
  });

  await recordAudit({
    workspaceId,
    actorId,
    action: "export",
    resourceType: "SddExport",
    resourceId: sddRecord.id,
  });

  return { document, prUrl };
}
